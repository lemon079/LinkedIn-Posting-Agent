# Phase 6: File/image uploading feature after post generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 06-file-image-uploading-feature-after-post-generation
**Areas discussed:** Signed URL Endpoint & Routing, Supabase Storage Config & Security, Streaming & Publish Integration

---

## Signed URL Endpoint & Routing

| Option | Description | Selected |
|--------|-------------|----------|
| GET /api/media/upload/sign | A new dedicated API endpoint for media URL signing. | ✓ (Claude's Choice) |
| POST /api/publish/sign | A sub-path under the existing publish route. | |
| You decide. | User defers decision to Claude. | ✓ (User Selected) |

| Option | Description | Selected |
|--------|-------------|----------|
| Send filename & mimeType, standard auth | Send filename and mimeType, requiring standard user authentication (with local mode fallback). | ✓ (Claude's Choice) |
| Send only mimeType | Send only mimeType (e.g. image/png), allowing anonymous uploads. | |
| You decide. | User defers decision to Claude. | ✓ (User Selected) |

| Option | Description | Selected |
|--------|-------------|----------|
| Return uploadUrl, storagePath, and readUrl | Return both the signed uploadUrl, the unique storagePath (key), and the readUrl (public URL for client preview). | ✓ (Claude's Choice) |
| Return only signed uploadUrl | Return only the signed uploadUrl. | |
| You decide. | User defers decision to Claude. | ✓ (User Selected) |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, enforce size constraints | Enforce content-length-range (max 4MB) in the signed URL and validate size on the client. | |
| No, rely on client and bucket limits | Rely only on client-side validation and Supabase Storage bucket limits. | ✓ (User Selected) |

**User's choice:** Mixed (deferred routing/parameters to Claude; explicitly chose no metadata size enforcement).
**Notes:** Client size validation and Supabase Storage configuration will be used to restrict file sizes to <= 4MB.

---

## Supabase Storage Config & Security

| Option | Description | Selected |
|--------|-------------|----------|
| portfolio-uploads | Uses a general user uploads bucket name. | |
| temp-uploads | Specifically named for temporary uploads. | ✓ (User Selected) |

| Option | Description | Selected |
|--------|-------------|----------|
| Restrict to authenticated users, public read | Restrict uploads to authenticated users (by user ID path), with public read for preview. | ✓ (User Selected) |
| Allow anonymous uploads | Allow anonymous uploads with public reads. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Partitioned by user ID | temp/${userId}/${randomId}-${filename} — Partitioned by user ID with collision prevention. | ✓ (User Selected) |
| Simplified without user ID | temp/${randomId}/${filename} — Simplified without user ID partitioning. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Database cron / TTL policy | Set up a database cron or Supabase Storage TTL to delete files older than 24h. | ✓ (User Selected) |
| Client-side triggers | Implement client-side delete triggers. | |

**User's choice:** Explicit choices.
**Notes:** Bucket `temp-uploads` will require users to authenticate to write. Read access will be public to simplify rendering feed previews in the browser and retrieval by the API. Partitioned paths and automatic TTL (24h) cleanup will keep storage uncluttered.

---

## Streaming & Publish Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Send storagePath | Send file object with name, type, and storagePath (bucket key). | ✓ (User Selected) |
| Send readUrl | Send file object with name, type, and public readUrl. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stream using admin client | Stream/download directly using the Supabase Storage admin client with service-role key. | |
| Fetch via readUrl | Fetch the file from the public readUrl via standard HTTP request. | ✓ (User Selected) |

| Option | Description | Selected |
|--------|-------------|----------|
| Load into buffer first | Load the file into a memory buffer first (safe for files up to 4MB). | |
| Pipe fetch stream | Pipe the fetch stream directly to LinkedIn's PUT request (stream-to-stream). | ✓ (User Selected) |

| Option | Description | Selected |
|--------|-------------|----------|
| Delete immediately | Delete immediately from Supabase Storage after successful publication. | ✓ (User Selected) |
| Rely on 24h cron only | Rely only on the 24h cron cleanup policy. | |

**User's choice:** Explicit choices.
**Notes:** The backend will fetch the temporary file from the public `readUrl` using a standard HTTP request. To conserve memory on the server, the fetch stream will be piped directly into the LinkedIn PUT upload request. Immediately upon successful publication, the backend will delete the file from the Supabase bucket.

---

## Claude's Discretion

- Routing and parameter details for the signed URL generation endpoint (`GET /api/media/upload/sign`).
- Client-side error UI and loading progress indication during direct upload.
- Local mode fallback behavior when Supabase keys are not set.

## Deferred Ideas

- Supporting multiple uploads / carousels.
- Supporting document formats other than PDF (e.g. Docx, PPTX).
