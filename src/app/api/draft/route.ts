import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { config } from "@/config/env";
import { getRequestAuth } from "@/lib/server/auth";
import { resolveAgentCredentials } from "@/lib/server/settings";
import type { DraftRequest } from "@/interfaces/draft";

export async function POST(request: Request) {
  const requestId = Date.now().toString();
  console.log(`[API-Draft][${requestId}] Incoming POST request received.`);
  try {
    const body = await request.json() as DraftRequest;
    const { topic, context, domain } = body;
    const selectedTopic = topic || "software engineering";
    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };

    console.log(`[API-Draft][${requestId}] Resolved topic: "${selectedTopic}"`);
    if (context) {
      console.log(`[API-Draft][${requestId}] Custom context provided (${context.length} chars).`);
    }

    const { user, client } = await getRequestAuth(request);
    if (user) {
      console.log(`[API-Draft][${requestId}] User identified: ${user.id} (${user.email})`);
    } else {
      console.log(`[API-Draft][${requestId}] Anonymous user (Local Mode).`);
    }

    const creds = await resolveAgentCredentials(request, client, user?.id);
    console.log(`[API-Draft][${requestId}] Resolved credentials - Provider: ${creds.provider || "gemini"}, Model: ${creds.model || "default"}, ApiKey: ${creds.apiKey ? "PRESENT" : "MISSING"}`);

    const initialState = {
      topic: selectedTopic,
      domain: domain || null,
      context: context !== undefined ? context : config.CONTEXT,
      llmProvider: creds.provider || null,
      llmApiKey: creds.apiKey || null,
      llmModel: creds.model || null,
      ollamaBaseUrl: creds.ollamaUrl || null,
      linkedinToken: creds.liToken || null,
      linkedinUrn: creds.liUrn || null,
    };

    console.log(`[API-Draft][${requestId}] Invoking streaming agent graph for thread ID: ${threadId}...`);

    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendEvent = (eventData: unknown) => {
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
            sendEvent({ type: "error", message: state.values.error });
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
          sendEvent({ type: "error", message: msg });
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
    console.error(`[API-Draft][${requestId}] Execution error encountered: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
