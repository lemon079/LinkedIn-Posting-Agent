export interface HealthRequest {
  provider: string;
  apiKey?: string;
  model?: string;
  ollamaBaseUrl?: string;
  useSavedKey?: boolean;
}

export interface HealthResponse {
  ok: boolean;
  error?: string;
  models?: string[];
}

export interface HealthResult {
  ok: boolean;
  error?: string;
  models?: string[];
}
