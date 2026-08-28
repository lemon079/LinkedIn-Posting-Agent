export interface MediaFileMetadata {
  name: string;
  type: string;
  storagePath?: string;
  readUrl?: string;
  base64?: string;
}

export interface MediaSignRequest {
  filename: string;
  mimeType: string;
}

export interface MediaSignResponse {
  localMode?: boolean;
  uploadUrl?: string;
  storagePath?: string;
  readUrl?: string;
  error?: string;
}
