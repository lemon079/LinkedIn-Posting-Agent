export interface LinkedInCallbackResult {
  accessToken: string;
  personUrn: string;
  expiresAt: number;
  actionLink?: string;
  emailOtp?: string;
  hashedToken?: string;
  email?: string;
}

export interface LinkedInCallbackResponse {
  accessToken: string;
  personUrn: string;
  actionLink?: string;
  emailOtp?: string;
  hashedToken?: string;
  email?: string;
  error?: string;
}
