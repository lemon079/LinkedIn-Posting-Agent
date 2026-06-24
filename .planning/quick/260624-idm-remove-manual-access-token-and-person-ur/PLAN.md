# Plan: Remove Manual LinkedIn Access Token and URN Fields

Remove the manual LinkedIn Access Token and Person URN input fields from the Settings Panel to enforce the "Sign In with LinkedIn" oauth sync flow as the sole connection method.

## Proposed Changes

### UI Components

#### [MODIFY] [SettingsPanel.tsx](file:///d:/Work/linkedin-agent/src/components/SettingsPanel.tsx)
- Remove the "Or Configure Manually" separator line.
- Remove the Access Token and Person URN password/text input fields.

---

## Verification Plan

### Automated Checks
- Run `npm run build` to confirm compilation.
- Run `npm run lint` to verify code quality.
- Run `npm run test` to verify unit tests.
