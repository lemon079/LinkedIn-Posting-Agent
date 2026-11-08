/**
 * @jest-environment node
 */
import { GET as callbackGet } from "@/app/api/auth/linkedin/callback/route";
import { GET as sessionGet, DELETE as sessionDelete } from "@/app/api/auth/session/route";
import { handleLinkedInCallback, getRequestAuth } from "@/modules/auth";
import { supabase } from "@/lib/supabase/server";

jest.mock("@/modules/auth", () => ({
  handleLinkedInCallback: jest.fn(),
  getRequestAuth: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  supabase: {
    auth: {
      verifyOtp: jest.fn(),
    },
  },
}));

describe("Secure OAuth Callback (/api/auth/linkedin/callback)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects with error if provider returns error", async () => {
    const request = new Request("http://localhost:3000/api/auth/linkedin/callback?error=user_cancelled&error_description=User+denied+access");
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("error=User%20denied%20access");
  });

  it("redirects with error if authorization code is missing", async () => {
    const request = new Request("http://localhost:3000/api/auth/linkedin/callback");
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("error=missing_code");
  });

  it("redirects with error on CSRF state mismatch", async () => {
    const request = new Request("http://localhost:3000/api/auth/linkedin/callback?code=mock_code&state=attack_state", {
      headers: {
        cookie: "li_oauth_state=legit_state",
      },
    });
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("error=invalid_oauth_state");
  });

  it("clears state cookie, sets secure httpOnly session cookie, and never exposes secrets in client cookies", async () => {
    const validState = "valid_random_nonce_123";
    (handleLinkedInCallback as jest.Mock).mockResolvedValue({
      accessToken: "secret_access_token_xyz",
      personUrn: "urn:li:person:12345",
      expiresAt: Date.now() + 3600000,
      actionLink: "http://localhost:3000/action_link",
      emailOtp: "123456",
      hashedToken: "hash_abcdef_789",
      email: "user@example.com",
    });

    (supabase!.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "supabase_session_jwt_token_999",
        },
      },
      error: null,
    });

    const request = new Request(`http://localhost:3000/api/auth/linkedin/callback?code=mock_auth_code&state=${validState}`, {
      headers: {
        cookie: `li_oauth_state=${validState}`,
      },
    });

    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");

    // Inspect Set-Cookie headers
    const cookies = response.cookies.getAll();

    // 1. li_oauth_state must be cleared (maxAge: 0)
    const stateCookie = cookies.find((c) => c.name === "li_oauth_state");
    expect(stateCookie).toBeDefined();
    expect(stateCookie?.maxAge).toBe(0);

    // 2. praxis_oauth_handoff must NOT exist or be cleared (maxAge: 0)
    const handoffCookie = cookies.find((c) => c.name === "praxis_oauth_handoff");
    if (handoffCookie) {
      expect(handoffCookie.maxAge).toBe(0);
      expect(handoffCookie.value).not.toContain("secret_access_token_xyz");
      expect(handoffCookie.value).not.toContain("123456");
      expect(handoffCookie.value).not.toContain("hash_abcdef_789");
    }

    // 3. praxis_session must be httpOnly: true, sameSite: "lax"
    const sessionCookie = cookies.find((c) => c.name === "praxis_session");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBe("supabase_session_jwt_token_999");
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(String(sessionCookie?.sameSite).toLowerCase()).toBe("lax");
  });
});

describe("Session Verification Route (/api/auth/session)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unauthenticated when no session is present", async () => {
    (getRequestAuth as jest.Mock).mockResolvedValue({
      user: null,
      token: undefined,
      client: null,
      isAnonymous: true,
    });

    const request = new Request("http://localhost:3000/api/auth/session");
    const response = await sessionGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
    expect(body.user).toBeNull();
  });

  it("returns authenticated user and token when session cookie is valid", async () => {
    (getRequestAuth as jest.Mock).mockResolvedValue({
      user: {
        id: "usr_12345",
        email: "alice@example.com",
        user_metadata: { name: "Alice", avatar_url: "https://example.com/avatar.jpg" },
      },
      token: "valid_supabase_jwt",
      client: null,
      isAnonymous: false,
    });

    const request = new Request("http://localhost:3000/api/auth/session", {
      headers: { cookie: "praxis_session=valid_supabase_jwt" },
    });
    const response = await sessionGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.user.id).toBe("usr_12345");
    expect(body.token).toBe("valid_supabase_jwt");
    expect(body.user.user_metadata.name).toBe("Alice");
  });

  it("DELETE /api/auth/session clears the praxis_session cookie", async () => {
    const response = await sessionDelete();
    const cookies = response.cookies.getAll();
    const sessionCookie = cookies.find((c) => c.name === "praxis_session");

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.maxAge).toBe(0);
    expect(sessionCookie?.httpOnly).toBe(true);
  });
});
