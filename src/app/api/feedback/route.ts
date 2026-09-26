import { NextResponse } from "next/server";
import { Client } from "langsmith";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

const log = logger.child({ module: "API-Feedback" });

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateCheck = checkRateLimit(`feedback_${clientIp}`, { limit: 30, windowMs: 60_000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { runId, score, value, comment } = body as {
      runId?: string;
      score?: number;
      value?: string;
      comment?: string;
    };

    if (!runId || typeof runId !== "string") {
      return NextResponse.json({ error: "runId (string) is required" }, { status: 400 });
    }
    if (typeof score !== "number" || (score !== 0 && score !== 1)) {
      return NextResponse.json({ error: "score must be 0 or 1" }, { status: 400 });
    }

    const client = new Client(); // reads LANGSMITH_API_KEY from env
    await client.createFeedback(runId, "user_rating", {
      score,
      value: value ?? (score === 1 ? "positive" : "negative"),
      comment: comment ?? undefined,
    });

    log.info("User feedback recorded", { runId, score, value: value ?? (score === 1 ? "positive" : "negative") });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Feedback submission failed", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
