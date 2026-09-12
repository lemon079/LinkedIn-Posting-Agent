import type { UserSettings } from "@/types";
import { apiRequest } from "./client";

export async function fetchUserSettings(token: string): Promise<UserSettings> {
  return apiRequest<UserSettings>(
    {
      url: "/api/user/settings",
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
    "Failed to load user settings"
  );
}

export async function saveUserSettings(
  settings: UserSettings,
  token: string
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    {
      url: "/api/user/settings",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: settings,
    },
    "Failed to save settings"
  );
}

export async function disconnectLinkedIn(
  token: string
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    {
      url: "/api/user/settings/linkedin",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    "Failed to disconnect LinkedIn account"
  );
}

