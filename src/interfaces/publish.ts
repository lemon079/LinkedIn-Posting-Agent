export interface MediaFileMetadata {
  name: string;
  type: string;
  storagePath?: string;
  readUrl?: string;
  base64?: string;
}

export interface PublishRequest {
  threadId: string;
  draft: string;
  file?: MediaFileMetadata | null;
}

export interface PublishResponse {
  postUrl?: string;
  error?: string;
}
