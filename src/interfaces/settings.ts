export interface UserSettings {
  provider?: string;
  apiKey?: string;
  modelName?: string;
  ollamaBaseUrl?: string;
  serverBaseUrl?: string;
  liToken?: string;
  liUrn?: string;
}

export interface SettingsResponse extends UserSettings {
  linkedInConnected: boolean;
  error?: string;
}

export interface SaveSettingsResponse {
  ok?: boolean;
  error?: string;
}
