import type { UserSettings } from "@/types";
import { apiRequest } from "./client";

export interface AuthSessionResponse {
  authenticated: boolean;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null;
  token: string | null;
  linkedInConnected: boolean;
  settings?: UserSettings | null;
  error?: string;
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>(
    {
      url: "/api/auth/session",
      method: "GET",
    },
    "Failed to load auth session"
  );
}

export async function clearAuthSession(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    {
      url: "/api/auth/session",
      method: "DELETE",
    },
    "Failed to clear auth session"
  );
}

export async function fetchUserSettings(token?: string): Promise<UserSettings> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return apiRequest<UserSettings>(
    {
      url: "/api/user/settings",
      method: "GET",
      headers,
    },
    "Failed to load user settings"
  );
}

export async function saveUserSettings(
  settings: UserSettings,
  token?: string
): Promise<{ ok: boolean }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return apiRequest<{ ok: boolean }>(
    {
      url: "/api/user/settings",
      method: "POST",
      headers,
      data: settings,
    },
    "Failed to save settings"
  );
}

export async function disconnectLinkedIn(
  token?: string
): Promise<{ ok: boolean }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return apiRequest<{ ok: boolean }>(
    {
      url: "/api/user/settings/linkedin",
      method: "DELETE",
      headers,
    },
    "Failed to disconnect LinkedIn account"
  );
}
