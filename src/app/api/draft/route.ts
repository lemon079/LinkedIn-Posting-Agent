import { NextResponse } from "next/server";
import { agent } from "@/modules/agent";
import { config } from "@/config/env";
import { getRequestAuth } from "@/modules/auth";
import { resolveAgentCredentials } from "@/modules/user";
import { redactSecrets } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { DraftRequest } from "@/modules/agent/types";
import type { StreamEvent, StreamErrorCode, HookOption } from "@/types";
import { classifyIntent } from "@/modules/agent/core/intent";
import { refineDraft, critiqueDraft } from "@/modules/agent/nodes";
import type { State } from "@/modules/agent/core/state";

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

function parseErrorInfo(rawError: string): {
  code: StreamErrorCode;
  retryAfterSeconds?: number;
  retryAfterMs?: number;
} {
  const err = rawError.toLowerCase();
  let code: StreamErrorCode = "UNKNOWN";

  if (err.includes("quota exceeded") || err.includes("resource_exhausted") || err.includes("insufficient_quota")) {
    code = "QUOTA_EXCEEDED";
  } else if (err.includes("rate limit") || err.includes("429") || err.includes("too many requests")) {
    code = "RATE_LIMIT";
  } else if (err.includes("overloaded") || err.includes("503") || err.includes("529") || err.includes("high demand")) {
    code = "MODEL_OVERLOADED";
  } else if (err.includes("timed out") || err.includes("timeout")) {
    code = "TIMEOUT";
  } else if (err.includes("unauthorized") || err.includes("401") || err.includes("api_key") || err.includes("forbidden")) {
    code = "AUTH_ERROR";
  }

  let retryAfterSeconds: number | undefined;
  let retryAfterMs: number | undefined;

  const retryMatch = rawError.match(/retry in ([\d\.]+)s/i) || rawError.match(/retry after ([\d\.]+)s/i);
  if (retryMatch) {
    const parsedSec = parseFloat(retryMatch[1]);
    if (!isNaN(parsedSec) && parsedSec > 0) {
      retryAfterSeconds = Math.ceil(parsedSec);
      retryAfterMs = Math.round(parsedSec * 1000);
    }
  }

  return { code, retryAfterSeconds, retryAfterMs };
}

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
    const {
      customTopic,
      context: userContext,
      domain,
      keys,
      currentDraft,
      threadId: incomingThreadId,
      followUpMessage,
      messages,
    } = body;

    let latestUserMessage = followUpMessage || "";
    if (!latestUserMessage && messages && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "user") {
        latestUserMessage = last.content;
      }
    }
    if (!latestUserMessage) {
      latestUserMessage = (customTopic && customTopic.trim()) || (body.topic && body.topic.trim()) || "";
    }

    const topic = (customTopic && customTopic.trim()) || (body.topic && body.topic.trim()) || latestUserMessage || "";
    log.info(`Request parameters resolved`, {
      topic,
      hasContext: Boolean(userContext),
      contextLengthChars: userContext?.length || 0,
      domain: domain || "auto",
      hasCurrentDraft: Boolean(currentDraft),
    });

    // Intent routing
    const classification = classifyIntent({
      message: latestUserMessage,
      currentDraft,
      topic,
      context: userContext,
    });

    log.info(`Intent classified`, {
      intent: classification.intent,
      scope: classification.targetScope,
      reason: classification.reason,
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

    const threadId = incomingThreadId || Date.now().toString();
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

          // ── Case 1: Question or Missing Metric without numbers → Route to chat bubble ──
          if (classification.intent === "question" || classification.intent === "missing_metric") {
            log.info(`Answering user conversationally without modifying draft`, { intent: classification.intent });
            sendEvent({
              type: "chat_message",
              text: classification.conversationalReply || "",
            });
            sendEvent({
              type: "final",
              threadId,
              draft: currentDraft || "",
              intent: classification.intent,
            });
            return;
          }

          // ── Case 2: Scoped Conversational Refinement of existing draft ──
          if (classification.intent === "refine" && currentDraft) {
            log.info(`Executing scoped conversational draft refinement`, {
              scope: classification.targetScope,
              changeNote: classification.changeNote,
            });
            sendEvent({ type: "node_start", node: "refineDraft", title: "Refining Draft" });

            let existingHooks: HookOption[] = [];
            try {
              const priorState = await agent.getState(threadConfig);
              if (priorState?.values?.alternativeHooks && priorState.values.alternativeHooks.length > 0) {
                existingHooks = priorState.values.alternativeHooks;
              }
            } catch {
              // in-memory or new
            }

            const refineState: State = {
              topic,
              context: userContext || "",
              domain: domain || null,
              draft: currentDraft,
              postContent: currentDraft,
              alternativeHooks: existingHooks,
              userFeedback: latestUserMessage,
              changeNote: null,
              refinementPasses: 0,
              userId: user?.id || null,
              activeDomain: domain || "general",
              intake: null,
              plan: "",
              searchContext: "",
              critique: null,
              critiqueCount: 0,
              critiqueScores: [],
              bestDraft: currentDraft,
              bestScore: 7,
              postUrl: null,
              retries: 0,
              error: null,
              reasoningSteps: [],
              linkedinToken: creds.liToken || null,
              linkedinUrn: creds.liUrn || null,
              llmProvider: provider || null,
              llmApiKey: apiKey || null,
              llmModel: model || null,
              ollamaBaseUrl: ollamaBaseUrl || null,
              mediaFiles: null,
              failedNode: null,
              lastFailedNode: null,
              errorRecoveryCount: 0,
              nodeRecoveryCounts: {},
              deadlineTimestamp,
              rawLlmResponse: null,
            };

            const refineResult = await refineDraft(refineState, threadConfig);
            const refinedText = refineResult.draft || currentDraft;
            const changeNote = refineResult.changeNote || classification.changeNote || "Refined draft based on feedback";

            sendEvent({ type: "token", node: "Refining Draft", text: refinedText });
            sendEvent({ type: "node_end", node: "refineDraft", title: "Refining Draft" });
            sendEvent({ type: "change_note", note: changeNote });

            // Evaluate quality with critic (pass threshold 7, max 2 passes)
            sendEvent({ type: "node_start", node: "critiqueDraft", title: "Evaluating Refined Quality" });
            const critiqueState: State = {
              ...refineState,
              draft: refinedText,
              postContent: refinedText,
            };
            const critiqueResult = await critiqueDraft(critiqueState, threadConfig);
            sendEvent({ type: "node_end", node: "critiqueDraft", title: "Evaluating Refined Quality" });

            let finalPost = refinedText;
            let finalChangeNote = changeNote;

            // If critic score < 7, perform 1 more polish pass (respecting max 2 passes cap)
            if ((critiqueResult.critique?.score ?? 10) < 7) {
              sendEvent({ type: "node_start", node: "refineDraft", title: "Polishing Refinement" });
              const pass2State: State = {
                ...critiqueState,
                critique: critiqueResult.critique || null,
                refinementPasses: 1,
              };
              const pass2Result = await refineDraft(pass2State, threadConfig);
              if (pass2Result.draft) {
                finalPost = pass2Result.draft;
                if (pass2Result.changeNote) finalChangeNote = pass2Result.changeNote;
              }
              sendEvent({ type: "node_end", node: "refineDraft", title: "Polishing Refinement" });
            }

            try {
              await agent.updateState(threadConfig, {
                draft: finalPost,
                postContent: finalPost,
                alternativeHooks: existingHooks,
                error: null,
              });
            } catch (e) {
              log.warn("Could not checkpoint refined state", { error: (e as Error).message });
            }

            sendEvent({
              type: "final",
              threadId,
              draft: finalPost,
              changeNote: finalChangeNote,
              intent: "refine",
              alternativeHooks: existingHooks,
            });
            return;
          }

          // ── Case 3: Initial Draft or New Post Generation from Scratch ──
          const initialState: State = {
            topic,
            context: userContext || "",
            domain: domain || null,
            userId: user?.id || null,
            llmProvider: provider || null,
            llmModel: model || null,
            ollamaBaseUrl: ollamaBaseUrl || null,
            deadlineTimestamp,
            activeDomain: domain || "general",
            intake: null,
            plan: "",
            searchContext: "",
            draft: "",
            alternativeHooks: [],
            userFeedback: null,
            changeNote: null,
            refinementPasses: 0,
            critique: null,
            critiqueCount: 0,
            critiqueScores: [],
            bestDraft: "",
            bestScore: 0,
            postContent: null,
            postUrl: null,
            retries: 0,
            error: null,
            reasoningSteps: [],
            linkedinToken: creds.liToken || null,
            linkedinUrn: creds.liUrn || null,
            llmApiKey: apiKey || null,
            mediaFiles: null,
            failedNode: null,
            lastFailedNode: null,
            errorRecoveryCount: 0,
            nodeRecoveryCounts: {},
            rawLlmResponse: null,
          };

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
            const errorInfo = parseErrorInfo(state.values.error);
            sendEvent({
              type: "error",
              message: redactSecrets(state.values.error),
              code: errorInfo.code,
              retryAfterSeconds: errorInfo.retryAfterSeconds,
              retryAfterMs: errorInfo.retryAfterMs,
              failedNode: state.values.failedNode || state.values.lastFailedNode,
            });
          } else if (state.next?.[0] !== "publishPost") {
            const nextNode = state.next?.[0];
            log.error(`Agent stopped unexpectedly`, { nextNode, durationMs });
            sendEvent({
              type: "error",
              message: `Agent stopped unexpectedly. Next: ${nextNode}`,
              code: "UNKNOWN",
            });
          } else {
            log.info(`Agent completed successfully`, {
              durationMs,
              draftLengthChars: state.values.postContent?.length || 0,
              finalScore: state.values.critique?.score,
              critiqueCount: state.values.critiqueCount,
              alternativeHooksCount: state.values.alternativeHooks?.length || 0,
            });
            if (state.values.alternativeHooks && state.values.alternativeHooks.length > 0) {
              sendEvent({
                type: "alternative_hooks",
                hooks: state.values.alternativeHooks,
              });
            }
            sendEvent({
              type: "final",
              threadId,
              draft: state.values.postContent,
              reasoningSteps: state.values.reasoningSteps,
              critique: state.values.critique,
              critiqueScores: state.values.critiqueScores,
              alternativeHooks: state.values.alternativeHooks,
            });
          }
        } catch (err: unknown) {
          const durationMs = Date.now() - startTime;
          const msg = err instanceof Error ? err.message : "Unknown error";
          log.error(`Stream execution error`, { error: msg, durationMs });
          const errorInfo = parseErrorInfo(msg);
          sendEvent({
            type: "error",
            message: redactSecrets(msg),
            code: errorInfo.code,
            retryAfterSeconds: errorInfo.retryAfterSeconds,
            retryAfterMs: errorInfo.retryAfterMs,
          });
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
