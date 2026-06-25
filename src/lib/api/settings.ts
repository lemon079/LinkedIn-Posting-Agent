import type { UserSettings } from "@/types/index.js";
import { apiFetch } from "./client";

export async function fetchUserSettings(token: string): Promise<UserSettings> {
  return apiFetch<UserSettings>("/api/user/settings", {
    headers: { Authorization: `Bearer ${token}` },
  }, "Failed to load user settings");
}

export async function saveUserSettings(
  settings: UserSettings,
  token: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/user/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  }, "Failed to save settings");
}
