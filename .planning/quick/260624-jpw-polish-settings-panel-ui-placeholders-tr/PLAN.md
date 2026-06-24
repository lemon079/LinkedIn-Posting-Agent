# Plan: Polish Settings Panel UI

Polish the settings panel UI to refine placeholders, support animations/transitions on desktop, format user-friendly connection errors, and make responsive updates.

## Proposed Changes

### UI Components

#### [MODIFY] [SettingsPanel.tsx](file:///d:/Work/linkedin-agent/src/components/SettingsPanel.tsx)
- Add `placeholder:text-xs` (or `placeholder:text-[13px]`) to inputs to make placeholders smaller on mobile and desktop screens.
- Hide the "Sign Out" button text on small screens, keeping only the LogOut icon (`hidden md:inline` for text).
- Implement connection error formatting/cleaning function `cleanErrorMessage` to make healthcheck connection errors user-friendly.

#### [MODIFY] [sheet.tsx](file:///d:/Work/linkedin-agent/src/components/ui/sheet.tsx)
- Correct Radix UI state selectors from `data-open:` / `data-closed:` to standard Tailwind `data-[state=open]:` and `data-[state=closed]:`.
- Use `-full` offsets instead of `-10` to ensure smooth slide transitions.

---

## Verification Plan

### Automated Checks
- Run `npm run build` to confirm compilation.
- Run `npm run lint` to verify code quality.
- Run `npm run test` to verify unit tests.
