# Plan: Resolve Vercel Next.js Detection Build Error

The Vercel deployment is failing because it cannot locate `next` in `package.json` in the configured build directory. This is due to the Vercel project still pointing to the deprecated `client` directory (from the old client-server structure) instead of the merged Next.js root directory.

## Proposed Resolution

### Vercel Dashboard Settings
- Update the **Root Directory** setting in the Vercel Dashboard from `client` to the repository root `.`.

---

## Verification Plan
- Ask the user to trigger a redeploy on Vercel after updating the root directory setting, and verify that the build succeeds.
