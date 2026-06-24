# Plan: Fix Sheet Transitions for Smooth Open/Close

Implement CSS transform-based transitions in the sheet component to fix the flick-open behavior on desktop screens and ensure smooth opening and closing animations.

## Proposed Changes

### UI Components

#### [MODIFY] [sheet.tsx](file:///d:/Work/linkedin-agent/src/components/ui/sheet.tsx)
- Replaced the keyframe animation classes with standard Tailwind CSS translation transition classes (`transition-transform duration-300 ease-in-out` and `translate-x-full` to `translate-x-0`).

---

## Verification Plan

### Automated Checks
- Run `npm run build` to confirm compilation.
- Run `npm run lint` to verify code quality.
- Run `npm run test` to verify unit tests.
