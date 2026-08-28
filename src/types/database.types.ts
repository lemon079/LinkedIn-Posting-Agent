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
          encrypted_linkedin_refresh_token: string | null;
          linkedin_token_expires_at: number | null;
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
          encrypted_linkedin_refresh_token?: string | null;
          linkedin_token_expires_at?: number | null;
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
          encrypted_linkedin_refresh_token?: string | null;
          linkedin_token_expires_at?: number | null;
          linkedin_urn?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_post_history: {
        Row: {
          id: string;
          user_id: string;
          hook: string;
          topic: string | null;
          domain: string | null;
          critique_score: number | null;
          published_at: string | null;
          linkedin_post_urn: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hook: string;
          topic?: string | null;
          domain?: string | null;
          critique_score?: number | null;
          published_at?: string | null;
          linkedin_post_urn?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hook?: string;
          topic?: string | null;
          domain?: string | null;
          critique_score?: number | null;
          published_at?: string | null;
          linkedin_post_urn?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      agent_checkpoints: {
        Row: {
          thread_id: string;
          checkpoint_id: string;
          parent_id: string | null;
          checkpoint_json: Json;
          metadata_json: Json | null;
          created_at: string;
        };
        Insert: {
          thread_id: string;
          checkpoint_id: string;
          parent_id?: string | null;
          checkpoint_json: Json;
          metadata_json?: Json | null;
          created_at?: string;
        };
        Update: {
          thread_id?: string;
          checkpoint_id?: string;
          parent_id?: string | null;
          checkpoint_json?: Json;
          metadata_json?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      agent_checkpoint_writes: {
        Row: {
          thread_id: string;
          checkpoint_id: string;
          task_id: string;
          idx: number;
          channel: string;
          type: string | null;
          value_json: Json | null;
          created_at: string;
        };
        Insert: {
          thread_id: string;
          checkpoint_id: string;
          task_id: string;
          idx: number;
          channel: string;
          type?: string | null;
          value_json?: Json | null;
          created_at?: string;
        };
        Update: {
          thread_id?: string;
          checkpoint_id?: string;
          task_id?: string;
          idx?: number;
          channel?: string;
          type?: string | null;
          value_json?: Json | null;
          created_at?: string;
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

export type UserPostHistoryRow = Database["public"]["Tables"]["user_post_history"]["Row"];
export type UserPostHistoryInsert = Database["public"]["Tables"]["user_post_history"]["Insert"];

export type AgentCheckpointRow = Database["public"]["Tables"]["agent_checkpoints"]["Row"];
export type AgentCheckpointWriteRow = Database["public"]["Tables"]["agent_checkpoint_writes"]["Row"];
