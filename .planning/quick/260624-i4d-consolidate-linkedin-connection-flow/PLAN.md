# Plan: Consolidate LinkedIn Connection Flow

Consolidate the LinkedIn authentication flow in the Settings Panel to establish the Account Sync's "Sign In with LinkedIn" as the single source of truth, removing the redundant "Connect LinkedIn Account" buttons and Reconnect links.

## Proposed Changes

### UI Components

#### [MODIFY] [SettingsPanel.tsx](file:///d:/Work/linkedin-agent/src/components/SettingsPanel.tsx)
- Remove the "Connect LinkedIn Account" button and the "Reconnect" link from the LinkedIn Account section.
- Display a clean status card indicating connection state (`LinkedIn Connected` or `LinkedIn Not Connected`), instructing unauthenticated users to sign in at the top of the panel.

---

## Verification Plan

### Automated Checks
- Run `npm run build` to confirm compilation.
- Run `npm run lint` to verify code quality.
- Run `npm run test` to verify unit tests.
