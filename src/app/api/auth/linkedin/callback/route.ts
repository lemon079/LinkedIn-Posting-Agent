import { NextResponse } from "next/server";
import { handleLinkedInCallback } from "@/modules/auth";
import { supabase } from "@/lib/supabase/server";
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

    // Tokens are safely saved in user_settings table via saveLinkedInCredentials.
    // Attempt session exchange on the server if hashedToken and supabase are available.
    let sessionToken: string | undefined;
    if (supabase && result.hashedToken) {
      try {
        const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: result.hashedToken,
          type: "magiclink",
        });
        if (!verifyError && authData?.session) {
          sessionToken = authData.session.access_token;
        }
      } catch (verifyErr) {
        log.warn("Server session exchange via verifyOtp encountered an error", {
          error: verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
        });
      }
    }

    // Determine redirect destination:
    // If session token was acquired directly, redirect to origin.
    // If not, fall back to actionLink which performs browser-based session verification.
    const redirectTarget = sessionToken ? `${baseUrl}/` : (result.actionLink || `${baseUrl}/`);
    const response = NextResponse.redirect(redirectTarget);

    // Clear the CSRF state cookie
    response.cookies.set("li_oauth_state", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    // Clear legacy insecure handoff cookie
    response.cookies.set("praxis_oauth_handoff", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    // If sessionToken is available, set secure, httpOnly session cookie
    if (sessionToken) {
      response.cookies.set("praxis_session", sessionToken, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      });
    }

    log.info(`OAuth flow completed successfully, redirecting`, {
      destination: sessionToken ? "origin" : "action_link",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown authorization error";
    log.error(`OAuth Callback failed`, { error: msg });
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(msg)}`);
  }
}

export const dynamic = "force-dynamic";
