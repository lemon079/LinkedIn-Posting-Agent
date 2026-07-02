export interface HealthRequest {
  provider: string;
  apiKey?: string;
  model?: string;
  ollamaBaseUrl?: string;
}

export interface HealthResponse {
  ok: boolean;
  error?: string;
  models?: string[];
}
