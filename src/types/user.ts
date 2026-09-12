import type {
  UserSettingsRow,
  UserSettingsInsert,
  UserSettingsUpdate,
  UserPostHistoryRow,
  UserPostHistoryInsert,
} from "./database.types";

export type {
  UserSettingsRow,
  UserSettingsInsert,
  UserSettingsUpdate,
  UserPostHistoryRow,
  UserPostHistoryInsert,
};

export interface UserSettings {
  provider?: string;
  apiKey?: string;
  modelName?: string;
  ollamaBaseUrl?: string;
  serverBaseUrl?: string;
  liToken?: string;
  liUrn?: string;
  liTokenExpiresAt?: number;
}

export interface SettingsResponse extends UserSettings {
  linkedInConnected: boolean;
  error?: string;
}

export interface SaveSettingsResponse {
  ok?: boolean;
  error?: string;
}

export interface AgentCredentials {
  provider?: string;
  apiKey?: string;
  model?: string;
  ollamaUrl?: string;
  liToken?: string;
  liUrn?: string;
}
