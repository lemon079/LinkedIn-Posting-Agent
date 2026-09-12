export interface LinkedInCallbackResult {
  accessToken: string;
  personUrn: string;
  expiresAt: number;
  actionLink?: string;
  emailOtp?: string;
  hashedToken?: string;
  email?: string;
}
