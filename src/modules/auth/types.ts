export interface LinkedInCallbackResult {
  accessToken: string;
  personUrn: string;
  expiresAt: number;
  localMode?: boolean;
  actionLink?: string;
  emailOtp?: string;
  email?: string;
}

export interface LinkedInCallbackResponse {
  accessToken: string;
  personUrn: string;
  localMode?: boolean;
  actionLink?: string;
  emailOtp?: string;
  email?: string;
  error?: string;
}
