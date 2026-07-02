export interface LinkedInCallbackResponse {
  accessToken: string;
  personUrn: string;
  localMode?: boolean;
  actionLink?: string;
  emailOtp?: string;
  email?: string;
  error?: string;
}
