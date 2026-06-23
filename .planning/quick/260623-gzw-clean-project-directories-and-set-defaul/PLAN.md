# Plan: Clean Project Root Folder & Configurations

Clean up the repository to establish the project root `.` as the sole source code directory, deleting obsolete directories and updating config files.

## Proposed Changes

### Configuration Cleanup

#### [MODIFY] [tsconfig.json](file:///d:/Work/linkedin-agent/tsconfig.json)
- Remove `client_old`, `client_src_backup`, `src_old`, and `next-temp` from the exclude list.

#### [MODIFY] [package.json](file:///d:/Work/linkedin-agent/package.json)
- Update project name from `next-temp` to `linkedin-posting-agent`.

### Directory Cleanup

#### [DELETE] [client_old](file:///d:/Work/linkedin-agent/client_old/)
- Delete the deprecated/obsolete folder.

#### [DELETE] [next-temp](file:///d:/Work/linkedin-agent/next-temp/)
- Delete the deprecated/obsolete Next.js build cache folder.

---

## Verification Plan

### Automated Checks
- Run `npx tsc --noEmit` to verify compilation.
- Run `npm run lint` to verify code style.
