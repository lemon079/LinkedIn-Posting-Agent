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
  files?: MediaFileMetadata[] | null;
}

export interface PublishResponse {
  postUrl?: string;
  error?: string;
}

export interface PublishPostResponse {
  postUrl?: string;
  error?: string;
}
