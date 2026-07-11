export interface UserSettings {
  provider?: string;
  apiKey?: string;
  modelName?: string;
  ollamaBaseUrl?: string;
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
