export interface AppConfig {
  GOOGLE_API_KEY: string;
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_PERSON_URN: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENCRYPTION_KEY: string;
  LINKEDIN_CLIENT_ID: string;
  LINKEDIN_CLIENT_SECRET: string;
  LINKEDIN_REDIRECT_URI: string;
  LANGSMITH_TRACING?: string;
  LANGSMITH_ENDPOINT?: string;
  LANGSMITH_API_KEY?: string;
  LANGSMITH_PROJECT?: string;
  LANGCHAIN_TRACING_V2?: string;
  LANGCHAIN_ENDPOINT?: string;
  LANGCHAIN_API_KEY?: string;
  LANGCHAIN_PROJECT?: string;
  defaultProvider?: string;
  defaultModel?: string;
}
