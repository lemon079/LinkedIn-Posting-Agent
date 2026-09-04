import { NextResponse } from "next/server";
import { handleLinkedInCallback } from "@/modules/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "OAuthCallback" });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  const baseUrl = new URL(request.url).origin;

  if (error) {
    const errorMsg = String(error_description || error);
    log.error(`OAuth provider error received`, { error: errorMsg });
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(errorMsg)}`);
  }

  if (!code) {
    log.error(`OAuth callback missing authorization code`);
    return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
  }

  // 1. CSRF State Validation
  const cookiesHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookiesHeader.match(/(?:^|;\s*)li_oauth_state=([^;]+)/);
  const storedState = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  if (!state || !storedState || state !== storedState) {
    log.error(`CSRF State mismatch in OAuth callback`, {
      receivedState: state ? "PRESENT" : "MISSING",
      storedState: storedState ? "PRESENT" : "MISSING",
    });
    return NextResponse.redirect(`${baseUrl}/?error=invalid_oauth_state`);
  }

  try {
    log.info(`Exchanging authorization code for credentials`);
    const result = await handleLinkedInCallback(code, baseUrl);

    // Base64 encode the payload to ensure 100% safety across all browsers and runtime decoders
    const payload = JSON.stringify({
      token: result.accessToken,
      urn: result.personUrn,
      expiresAt: result.expiresAt,
      email: result.email,
      otp: result.emailOtp,
      hashedToken: result.hashedToken,
    });
    const base64Payload = Buffer.from(payload, "utf-8").toString("base64");

    // Safe cookie-only handoff: tokens are not exposed in URL query parameters
    const redirectUrl = new URL(`${baseUrl}/`);
    const response = NextResponse.redirect(redirectUrl.toString());

    // Clear the CSRF state cookie
    response.cookies.set("li_oauth_state", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    response.cookies.set("praxis_oauth_handoff", base64Payload, {
      path: "/",
      maxAge: 300, // 5 minute one-time handoff window
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // Readable by client app during initialization
    });

    log.info(`OAuth flow completed successfully, redirecting to origin`, {
      baseUrl,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown authorization error";
    log.error(`OAuth Callback failed`, { error: msg });
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(msg)}`);
  }
}

export const dynamic = "force-dynamic";
