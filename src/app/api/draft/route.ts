import { NextResponse } from "next/server";
import { agent } from "@/modules/agent";
import { config } from "@/config/env";
import { getRequestAuth } from "@/modules/auth";
import { resolveAgentCredentials } from "@/modules/user";
import { redactSecrets } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { DraftRequest } from "@/modules/agent/types";
import type { StreamEvent } from "@/types";

// ── Node name → user-facing step title mapping ──────────────────────────
const NODE_TITLES: Record<string, string> = {
  analyzeIntake: "Analyzing Your Input",
  generateDraft: "Writing First Draft",
  critiqueDraft: "Self-Critiquing Draft",
  refineDraft: "Refining Based on Feedback",
};

// Nodes whose streaming events we forward to the client
const STREAMABLE_NODES = new Set(Object.keys(NODE_TITLES));

import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = Date.now().toString();
  const log = logger.child({ module: "API-Draft", requestId });

  const clientIp = getClientIp(request);
  const rateCheck = checkRateLimit(`draft_${clientIp}`, { limit: 20, windowMs: 60_000 });
  if (!rateCheck.allowed) {
    log.warn(`Rate limit exceeded for draft generation`, { clientIp });
    return NextResponse.json(
      { error: "Too many draft generation requests. Please slow down and try again in a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)) } }
    );
  }

  log.info(`Incoming draft generation request received`);

  try {
    const body: DraftRequest = await request.json();
    const { customTopic, context: userContext, domain, keys } = body;

    const topic = (customTopic && customTopic.trim()) || (body.topic && body.topic.trim()) || "";
    log.info(`Request parameters resolved`, {
      topic,
      hasContext: Boolean(userContext),
      contextLengthChars: userContext?.length || 0,
      domain: domain || "auto",
    });

    const { client, user, authError } = await getRequestAuth(request);
    if (authError) {
      log.warn(`Rejecting request with expired or invalid auth token`, { error: authError });
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    log.info(`Auth context resolved`, {
      userId: user?.id || "anonymous",
      authenticated: Boolean(user),
    });

    const creds = await resolveAgentCredentials(request, client, user?.id);
    const hasLinkedIn = Boolean(creds.liToken || config.LINKEDIN_ACCESS_TOKEN || user);
    if (!hasLinkedIn) {
      log.warn(`Rejecting draft request: LinkedIn authentication required`);
      return NextResponse.json(
        { error: "LinkedIn authentication is required to generate drafts. Please sign in with LinkedIn." },
        { status: 401 }
      );
    }

    const provider = keys?.provider || creds.provider || config.defaultProvider;
    const model = keys?.modelName || creds.model || config.defaultModel;
    const apiKey = keys?.apiKey || creds.apiKey;
    const ollamaBaseUrl = keys?.ollamaBaseUrl || creds.ollamaUrl;

    log.info(`LLM credentials resolved`, {
      provider,
      model,
      hasApiKey: Boolean(apiKey),
    });

    const deadlineTimestamp = startTime + 35_000; // 35s hard latency budget ceiling

    const initialState = {
      topic,
      context: userContext || "",
      domain: domain || null,
      userId: user?.id || null,
      llmProvider: provider,
      llmModel: model,
      ollamaBaseUrl,
      deadlineTimestamp,
    };

    const threadId = Date.now().toString();
    const threadConfig = {
      configurable: {
        thread_id: threadId,
        userId: user?.id || undefined,
        apiKey: apiKey || undefined,
        liToken: creds.liToken || undefined,
        liUrn: creds.liUrn || undefined,
      },
    };

    log.info(`Starting agent streaming execution`, { threadId });

    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendEvent = (eventData: StreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        };

        try {
          // Send initial thread ID
          sendEvent({ type: "thread", threadId });

          const eventStream = agent.streamEvents(initialState, {
            version: "v2",
            configurable: threadConfig.configurable,
            runName: "praxis-draft-pipeline",
            tags: ["praxis", "linkedin-agent", domain || "general", provider || "google"],
            metadata: {
              userId: user?.id || "anonymous",
              threadId,
              topic: topic || "untitled",
              provider,
              model,
            },
          });

          let currentStepTitle = "";

          for await (const event of eventStream) {
            if (event.event === "on_chain_start") {
              const nodeName = event.name;
              if (STREAMABLE_NODES.has(nodeName)) {
                const title = NODE_TITLES[nodeName];
                currentStepTitle = title;
                sendEvent({ type: "node_start", node: nodeName, title });
              }
            } else if (event.event === "on_chat_model_stream" && currentStepTitle) {
              const content = event.data.chunk?.content;
              if (typeof content === "string" && content) {
                sendEvent({ type: "token", node: currentStepTitle, text: content });
              } else if (Array.isArray(content)) {
                for (const part of content) {
                  if (part.type === "text" && part.text) {
                    if (part.thought) {
                      sendEvent({ type: "thinking", node: "Model Thinking", text: part.text });
                    } else {
                      sendEvent({ type: "token", node: currentStepTitle, text: part.text });
                    }
                  }
                }
              }
            } else if (event.event === "on_chain_end") {
              const nodeName = event.name;
              if (STREAMABLE_NODES.has(nodeName)) {
                sendEvent({ type: "node_end", node: nodeName, title: currentStepTitle });
              }
            }
          }

          const state = await agent.getState(threadConfig);
          const durationMs = Date.now() - startTime;

          if (state.values.error) {
            log.error(`Agent completed with error`, { error: state.values.error, durationMs });
            sendEvent({ type: "error", message: redactSecrets(state.values.error) });
          } else if (state.next?.[0] !== "publishPost") {
            const nextNode = state.next?.[0];
            log.error(`Agent stopped unexpectedly`, { nextNode, durationMs });
            sendEvent({ type: "error", message: `Agent stopped unexpectedly. Next: ${nextNode}` });
          } else {
            log.info(`Agent completed successfully`, {
              durationMs,
              draftLengthChars: state.values.postContent?.length || 0,
              finalScore: state.values.critique?.score,
              critiqueCount: state.values.critiqueCount,
            });
            sendEvent({
              type: "final",
              threadId,
              draft: state.values.postContent,
              reasoningSteps: state.values.reasoningSteps,
              critique: state.values.critique,
              critiqueScores: state.values.critiqueScores,
            });
          }
        } catch (err: unknown) {
          const durationMs = Date.now() - startTime;
          const msg = err instanceof Error ? err.message : "Unknown error";
          log.error(`Stream execution error`, { error: msg, durationMs });
          sendEvent({ type: "error", message: redactSecrets(msg) });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error(`Draft API handler failed`, { error: msg, durationMs });
    return NextResponse.json({ error: redactSecrets(msg) }, { status: 500 });
  }
}
