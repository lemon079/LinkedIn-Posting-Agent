export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          user_id: string;
          llm_provider: string | null;
          encrypted_api_key: string | null;
          llm_model: string | null;
          ollama_base_url: string | null;
          encrypted_tavily_key: string | null;
          encrypted_linkedin_token: string | null;
          linkedin_urn: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          llm_provider?: string | null;
          encrypted_api_key?: string | null;
          llm_model?: string | null;
          ollama_base_url?: string | null;
          encrypted_tavily_key?: string | null;
          encrypted_linkedin_token?: string | null;
          linkedin_urn?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          llm_provider?: string | null;
          encrypted_api_key?: string | null;
          llm_model?: string | null;
          ollama_base_url?: string | null;
          encrypted_tavily_key?: string | null;
          encrypted_linkedin_token?: string | null;
          linkedin_urn?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
export type UserSettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
export type UserSettingsUpdate = Database["public"]["Tables"]["user_settings"]["Update"];
