# Quick Task 260618-fjq Summary: Single Dev Command

Concurrently run the frontend client and backend API server with a single unified CLI command.

## Proposed Changes

### 1. Installed Dev Dependency
- Installed `concurrently` package in root `package.json` to manage running parallel tasks.

### 2. Configured npm script
- Added `"dev"` script to root `package.json` scripts block:
  ```json
  "dev": "concurrently \"npm run server\" \"npm --prefix client run dev\""
  ```

---

## Verification Results

### Unified Server Boot
- Executing `npm run dev` successfully boots:
  - **Backend Express Server:** `http://localhost:3000`
  - **Vite React Frontend:** `http://localhost:5173`
- Client requests are proxied via the Vite server to the backend successfully.
