# Debug Session: LinkedIn Localhost Redirect Bug

## Symptoms
- **Expected**: Signing in with LinkedIn on localhost redirects back to localhost and logs the user in.
- **Actual**: Signing in with LinkedIn on localhost redirects to the production Vercel URL.
- **Reproduction**: Click "Sign In with LinkedIn" on localhost, complete login on LinkedIn, and observe the final page location.

## Root Cause
1. The LinkedIn OAuth callback endpoint (`/api/auth/linkedin/callback`) exchanges the code for a token and gets user details.
2. If Supabase is active, it calls `supabase.auth.admin.generateLink` to generate a magic link (`action_link`).
3. It redirects the user's browser to the `action_link` (on the Supabase domain).
4. The Supabase auth server verifies the magic link, but because `http://localhost:3000` is not in the allowed redirect list in the production Supabase project settings, it redirects the browser to the default site URL (Vercel).

## Solution
1. Modify `/api/auth/linkedin/callback` route:
   - Instead of redirecting to the Supabase `action_link` directly when on localhost (or in all environments to be robust), redirect directly to our local site callback URL passing `email` and the OTP code (`linkData.properties.email_otp`) in the query parameters.
2. Modify `useAgent.ts` client hook:
   - Detect `email` and `otp` parameters in the URL.
   - If present, call `supabase.auth.verifyOtp({ email, token: otp, type: "magiclink" })` to log in programmatically in the browser.
   - Clean up `email` and `otp` query parameters from the window location history.
