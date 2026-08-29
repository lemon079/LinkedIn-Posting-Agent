import { NextResponse } from "next/server";
import { agent, publishPost as executePublishNode } from "@/modules/agent";
import { getRequestAuth } from "@/modules/auth";
import { resolveLinkedInCredentials } from "@/modules/user";
import { config } from "@/config/env";
import { redactSecrets } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { PublishRequest } from "@/modules/linkedin/types";

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = Date.now().toString();
  const log = logger.child({ module: "API-Publish", requestId });

  log.info(`Incoming post publish request received`);

  try {
    const body = (await request.json()) as PublishRequest;
    const { threadId, draft, files } = body;

    if (!draft || !draft.trim() || !threadId) {
      log.error(`Validation error: Missing threadId or draft content`);
      return NextResponse.json({ error: "Missing threadId or draft" }, { status: 400 });
    }

    if (draft.length > 3000) {
      log.error(`Validation error: Draft exceeds LinkedIn character limit (${draft.length} chars)`);
      return NextResponse.json(
        { error: `Draft exceeds LinkedIn limit of 3,000 characters (current: ${draft.length}).` },
        { status: 400 }
      );
    }

    log.info(`Publish parameters received`, {
      threadId,
      draftLengthChars: draft.length,
      attachmentsCount: files?.length || 0,
    });

    const { user, client, authError } = await getRequestAuth(request);
    if (authError) {
      log.warn(`Rejecting publish request with expired or invalid auth token`, { error: authError });
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    log.info(`Auth context resolved`, {
      userId: user?.id || "anonymous",
      authenticated: Boolean(user),
    });

    const { liToken, liUrn } = await resolveLinkedInCredentials(request, client, user?.id);
    const effectiveToken = liToken || config.LINKEDIN_ACCESS_TOKEN;
    const effectiveUrn = liUrn || config.LINKEDIN_PERSON_URN;

    if (!effectiveToken || !effectiveUrn) {
      log.error(`LinkedIn credentials missing for user`, { userId: user?.id || "anonymous" });
      return NextResponse.json(
        { error: "LinkedIn not connected. Please sign in with LinkedIn in Settings." },
        { status: 401 }
      );
    }

    let postUrl: string | undefined = undefined;
    let resumeAttempted = false;

    // 1. If threadId is provided, check if the graph thread exists and is paused before publishPost
    if (threadId) {
      try {
        const threadConfig = { configurable: { thread_id: threadId } };
        const state = await agent.getState(threadConfig);

        if (state.values && state.next?.[0] === "publishPost") {
          resumeAttempted = true;
          log.info(`Resuming paused graph thread for publication`, { threadId });
          await agent.updateState(threadConfig, {
            postContent: draft,
            linkedinToken: effectiveToken || null,
            linkedinUrn: effectiveUrn || null,
            mediaFiles: files || null,
            error: null,
          });

          const finalState = await agent.invoke(null, threadConfig);

          if (finalState?.error) {
            log.error(`Resumed graph execution failed`, { error: finalState.error });
            return NextResponse.json({ error: redactSecrets(finalState.error) }, { status: 500 });
          }

          postUrl = finalState?.postUrl || undefined;
        }
      } catch (graphErr: unknown) {
        log.warn(`Graph state resumption encountered an issue`, {
          error: graphErr instanceof Error ? graphErr.message : String(graphErr),
        });
      }
    }

    // 2. Direct execution fallback only if thread was not already resumed and executed
    if (!postUrl && !resumeAttempted) {
      log.info(`Executing publish node directly with request payload`);
      const directResult = await executePublishNode({
        topic: "",
        postContent: draft,
        userId: user?.id || null,
        linkedinToken: effectiveToken || null,
        linkedinUrn: effectiveUrn || null,
        mediaFiles: files || null,
      });

      if (directResult.error) {
        const durationMs = Date.now() - startTime;
        log.error(`Direct publishing failed`, { error: directResult.error, durationMs });
        return NextResponse.json({ error: redactSecrets(directResult.error) }, { status: 500 });
      }

      postUrl = directResult.postUrl || undefined;
    }

    if (!postUrl) {
      log.error(`Publishing completed but no post URL was returned`);
      return NextResponse.json(
        { error: "LinkedIn publication did not return a post confirmation URL." },
        { status: 500 }
      );
    }

    const durationMs = Date.now() - startTime;
    log.info(`Post published successfully to LinkedIn`, {
      postUrl,
      durationMs,
      threadId,
    });

    return NextResponse.json({ postUrl });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error(`Publish API handler failed`, { error: msg, durationMs });
    return NextResponse.json({ error: redactSecrets(msg) }, { status: 500 });
  }
}
