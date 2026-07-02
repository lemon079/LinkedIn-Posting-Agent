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
