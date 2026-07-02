import { NextResponse } from "next/server";
import { handleLinkedInCallback } from "@/services/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  const baseUrl = new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
  }

  try {
    const result = await handleLinkedInCallback(code, baseUrl);

    if (result.localMode) {
      return NextResponse.redirect(
        `${baseUrl}/?li_token=${encodeURIComponent(result.accessToken)}&li_urn=${encodeURIComponent(result.personUrn)}`
      );
    }

    if (baseUrl.includes("localhost") && result.emailOtp && result.email) {
      return NextResponse.redirect(
        `${baseUrl}/?li_token=${encodeURIComponent(result.accessToken)}&li_urn=${encodeURIComponent(result.personUrn)}&email=${encodeURIComponent(result.email)}&otp=${encodeURIComponent(result.emailOtp)}`
      );
    }

    if (result.actionLink) {
      return NextResponse.redirect(result.actionLink);
    }

    throw new Error("Invalid callback state");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown authorization error";
    console.error(`[API] OAuth Callback failed: ${msg}`);
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(msg)}`);
  }
}

export const dynamic = "force-dynamic";
