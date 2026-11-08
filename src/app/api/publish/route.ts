import { NextResponse } from "next/server";
import { getRequestAuth } from "@/modules/auth/session";
import { publishPost as executePublishNode } from "@/modules/agent/nodes/publishPost";
import { agent } from "@/modules/agent";
import { resolveLinkedInCredentials } from "@/modules/user";
import { redactSecrets } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { validateSafeUrl } from "@/lib/security/urlValidation";
import type { PublishRequest } from "@/modules/linkedin/types";

import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { config } from "@/config/env";

const log = logger.child({ module: "API-Publish" });

export async function POST(request: Request) {
  const startTime = Date.now();
  log.info(`Incoming post publish request received`);

  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`publish:${ip}`, {
      windowMs: 60 * 1000,
      limit: 10,
    });

    if (!rateLimit.allowed) {
      log.warn(`Publish endpoint rate limit exceeded`, { ip });
      return NextResponse.json(
        { error: "Too many publish requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as PublishRequest;
    const { draft, threadId, files } = body;

    if (!draft || !threadId) {
      log.error(`Validation error: Missing threadId or draft`);
      return NextResponse.json(
        { error: "Missing threadId or draft" },
        { status: 400 }
      );
    }

    // SSRF Validation: Validate any media file read URLs
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.readUrl) {
          const safeValidation = validateSafeUrl(file.readUrl, { allowLocal: false });
          if (!safeValidation.isValid) {
            log.error(`Disallowed media readUrl in publish payload`, { url: file.readUrl });
            return NextResponse.json(
              { error: `Invalid or disallowed media attachment URL: ${safeValidation.error || "Blocked URL"}` },
              { status: 400 }
            );
          }
          if (config.SUPABASE_URL) {
            try {
              const trustedHost = new URL(config.SUPABASE_URL).hostname.toLowerCase();
              const readUrlHost = new URL(file.readUrl).hostname.toLowerCase();
              if (readUrlHost !== trustedHost) {
                log.error(`Untrusted media host in publish payload`, { readUrlHost, trustedHost });
                return NextResponse.json(
                  {
                    error: `Disallowed media attachment host "${readUrlHost}". Host must match trusted Supabase storage host.`,
                  },
                  { status: 400 }
                );
              }
            } catch {
              return NextResponse.json(
                { error: "Invalid media attachment URL." },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    log.info(`Publish parameters received`, {
      threadId,
      draftLengthChars: draft.length,
      attachmentsCount: files?.length || 0,
    });

    // Enforce Option 2A: Strict Authentication Check
    const { user, client, authError } = await getRequestAuth(request);
    if (!user || authError) {
      log.warn(`Rejecting publish request: user not authenticated`, { error: authError });
      return NextResponse.json({ error: "Authentication required to publish." }, { status: 401 });
    }

    log.info(`Auth context resolved`, {
      userId: user.id,
      authenticated: true,
    });

    // Only resolve the authenticated user's credentials — never fall back to server .env for publish
    const { liToken, liUrn } = await resolveLinkedInCredentials(request, client, user.id);
    const effectiveToken = liToken;
    const effectiveUrn = liUrn;

    if (!effectiveToken || !effectiveUrn) {
      log.error(`LinkedIn credentials missing for user`, { userId: user.id });
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
        const threadConfig = {
          configurable: {
            thread_id: threadId,
            userId: user.id,
            liToken: effectiveToken || undefined,
            liUrn: effectiveUrn || undefined,
          },
        };
        const state = await agent.getState(threadConfig);

        if (state.values && state.next?.[0] === "publishPost") {
          resumeAttempted = true;
          log.info(`Resuming paused graph thread for publication`, { threadId });
          await agent.updateState(threadConfig, {
            postContent: draft,
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
        userId: user.id,
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

    const durationMs = Date.now() - startTime;
    log.info(`Publish request succeeded`, { postUrl, durationMs });
    return NextResponse.json({ postUrl });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : "Internal server error";
    log.error(`Unhandled error during post publishing`, { error: msg, durationMs });
    return NextResponse.json({ error: redactSecrets(msg) }, { status: 500 });
  }
}
