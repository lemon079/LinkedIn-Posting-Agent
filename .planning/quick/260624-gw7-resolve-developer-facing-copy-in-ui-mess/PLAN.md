# Plan: User-Friendly Copy Refinement

Refine user-facing messages, headings, and descriptions to ensure they are friendly and polished for non-technical end-users, rather than showing developer-centric concepts.

## Proposed Changes

### UI Components Copy

#### [MODIFY] [ControlPanel.tsx](file:///d:/Work/linkedin-agent/src/components/ControlPanel.tsx)
- Change "Configure Agent Parameters" card title to "Post Draft Settings".
- Change "Default Genres" select label to "Topic Templates".

#### [MODIFY] [SettingsPanel.tsx](file:///d:/Work/linkedin-agent/src/components/SettingsPanel.tsx)
- Change "System Settings" to "Account & API Settings".
- Change "Configure credentials, local models, and external APIs" to "Configure your account sync, AI engine, and search keys".
- Change "Cloud Sync Profile" to "Account Sync".
- Change "Cloud sync is active. Your settings are encrypted and securely synced to your private database profile" to "Settings synchronized. Your configurations are saved securely".
- Change "Language Model (LLM) Configuration" to "AI Engine Settings".
- Change "LLM Provider" to "AI Provider".
- Change "Provider API Key" to "API Key".
- Change "Web Search Grounding" to "Web Search Integration".
- Change "Optional. Real-time web search key to fetch references and ground posts in technical details" to "Optional. Used to fetch real-time facts and references from the web".
- Change "LinkedIn Account Credentials" to "LinkedIn Account".
- Change "Or Config Manually" to "Or Configure Manually".
- Update footers to say "Your settings are securely saved in your cloud profile" and "Your settings are saved locally in this browser".

#### [MODIFY] [AuthForm.tsx](file:///d:/Work/linkedin-agent/src/components/AuthForm.tsx)
- Change "Sign In to Agent Portal" to "Sign In to Dashboard".
- Change "Authenticate using your LinkedIn account to access and sync your settings securely" to "Sign in with your LinkedIn account to sync your settings securely".

---

## Verification Plan

### Automated Checks
- Run `npm run build` to confirm compilation.
- Run `npm run lint` to verify code quality.
- Run `npm run test` to verify unit tests.
