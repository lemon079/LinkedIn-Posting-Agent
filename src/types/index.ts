export interface AppConfig {
  GOOGLE_API_KEY: string;
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_PERSON_URN: string;
  TOPIC?: string;
  CONTEXT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENCRYPTION_KEY: string;
  LINKEDIN_CLIENT_ID: string;
  LINKEDIN_CLIENT_SECRET: string;
  LINKEDIN_REDIRECT_URI: string;
}

export interface PublishPostResponse {
  postUrl?: string;
  error?: string;
}

export interface LLMOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  ollamaBaseUrl?: string;
}

export interface HealthResult {
  ok: boolean;
  error?: string;
  models?: string[];
}

export interface DraftResponse {
  draft: string;
  threadId: string;
}

export interface PublishResponse {
  postUrl: string;
}

export interface HealthResponse {
  ok: boolean;
  error?: string;
  models?: string[];
}

export interface CustomKeys {
  provider: string;
  apiKey: string;
  liToken: string;
  liUrn: string;
  modelName: string;
  ollamaBaseUrl: string;
  tavilyKey: string;
  token?: string;
}

export interface UserSettings {
  provider?: string;
  apiKey?: string;
  modelName?: string;
  ollamaBaseUrl?: string;
  tavilyKey?: string;
  liToken?: string;
  liUrn?: string;
}
