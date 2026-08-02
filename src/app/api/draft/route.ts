import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { config } from "@/config/env";
import { getRequestAuth } from "@/lib/server/auth";
import { resolveAgentCredentials } from "@/lib/server/settings";
import { redactSecrets } from "@/lib/utils";
import type { DraftRequest } from "@/interfaces/draft";
import type { StreamEvent } from "@/interfaces/stream";

export async function POST(request: Request) {
  const requestId = Date.now().toString();
  console.log(`[API-Draft][${requestId}] Incoming POST request received.`);

  try {
    const body: DraftRequest = await request.json();
    const { customTopic, context: userContext, domain, keys } = body;

    const topic = customTopic && customTopic.trim() ? customTopic.trim() : config.defaultTopic;
    console.log(`[API-Draft][${requestId}] Resolved topic: "${topic}"`);
    if (userContext) {
      console.log(`[API-Draft][${requestId}] Custom context provided (${userContext.length} chars).`);
    }

    const { client, user } = await getRequestAuth(request);
    if (user) {
      console.log(`[API-Draft][${requestId}] User authenticated: ${user.id}`);
    } else {
      console.log(`[API-Draft][${requestId}] Anonymous user (Local Mode).`);
    }

    const creds = await resolveAgentCredentials(request, client, user?.id);
    const provider = keys?.provider || creds.provider || config.defaultProvider;
    const model = keys?.modelName || creds.model || config.defaultModel;
    const apiKey = keys?.apiKey || creds.apiKey;
    const ollamaBaseUrl = keys?.ollamaBaseUrl || creds.ollamaBaseUrl;

    console.log(`[API-Draft][${requestId}] Resolved credentials - Provider: ${provider}, Model: ${model}, ApiKey: ${apiKey ? "PRESENT" : "MISSING"}`);

    const initialState = {
      topic,
      customContext: userContext || "",
      domain: domain || "auto",
      customProvider: provider,
      customApiKey: apiKey,
      customModelName: model,
      customOllamaBaseUrl: ollamaBaseUrl,
    };

    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };

    console.log(`[API-Draft][${requestId}] Invoking streaming agent graph for thread ID: ${threadId}...`);

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
          });

          let currentStepTitle = "";

          for await (const event of eventStream) {
            if (event.event === "on_chain_start") {
              const nodeName = event.name;
              if (["generateDraft", "reviewAndRefine"].includes(nodeName)) {
                let title = "";
                if (nodeName === "generateDraft") title = "Planning & Drafting";
                else if (nodeName === "reviewAndRefine") title = "Review & Polish";

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
              if (["generateDraft", "reviewAndRefine"].includes(nodeName)) {
                sendEvent({ type: "node_end", node: nodeName, title: currentStepTitle });
              }
            }
          }

          const state = await agent.getState(threadConfig);
          if (state.values.error) {
            sendEvent({ type: "error", message: redactSecrets(state.values.error) });
          } else if (state.next?.[0] !== "publishPost") {
            sendEvent({ type: "error", message: `Agent stopped unexpectedly. Next: ${state.next?.[0]}` });
          } else {
            sendEvent({
              type: "final",
              threadId,
              draft: state.values.postContent,
              reasoningSteps: state.values.reasoningSteps,
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
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
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API-Draft][${requestId}] Execution error encountered: ${redactSecrets(msg)}`);
    return NextResponse.json({ error: redactSecrets(msg) }, { status: 500 });
  }
}
