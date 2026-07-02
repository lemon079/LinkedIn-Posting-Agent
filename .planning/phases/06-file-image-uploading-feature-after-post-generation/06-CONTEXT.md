# Phase 6: File/image uploading feature after post generation - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enables the user to upload a single image (JPEG, PNG, WebP) or document (PDF) after generating a post, preview it in the editor and in high fidelity in the LinkedIn feed preview, and publish it to LinkedIn using a Supabase Storage-based media upload flow. The media is uploaded to Supabase Storage immediately upon selection, and the server-side agent streams the file from Supabase Storage to the LinkedIn API during publication, followed by a cleanup deletion of the temp file.

</domain>

<decisions>
## Implementation Decisions

### Signed URL Endpoint & Routing
- **D-01:** The server provides a GET API endpoint `/api/media/upload/sign` to generate and return a signed upload URL.
- **D-02:** The client requests the signed URL by passing `filename` and `mimeType` in query parameters.
- **D-03:** Authentication for the signed URL request is handled via standard user JWT authentication (with a local mode fallback when Supabase auth is not active).
- **D-04:** The response from `/api/media/upload/sign` contains the signed `uploadUrl`, the unique `storagePath` (key), and the `readUrl` (public URL for previews).
- **D-05:** No server-side size constraints will be enforced inside the signed URL options; file size validation is handled on the client-side and via Supabase Storage bucket configurations.

### Supabase Storage Config & Security
- **D-06:** The Supabase Storage bucket used is named `temp-uploads`.
- **D-07:** The bucket is configured with security policies that restrict uploads to authenticated users (matching their user ID in the path), with public read access enabled to allow client-side previews.
- **D-08:** The path prefix within the `temp-uploads` bucket is structured as `temp/${userId}/${randomId}-${filename}` (or a fallback without `userId` in local/anonymous mode).
- **D-09:** Orphans (files uploaded but never published) are cleaned up automatically via a database cron or Supabase Storage TTL policy deleting files older than 24 hours.

### Streaming & Publish Integration
- **D-10:** The publish API endpoint `/api/publish` receives file details from the client via a file object containing `name`, `type`, and `storagePath` (bucket key).
- **D-11:** The server-side API handler/agent downloads the file by making a standard HTTP request to the public `readUrl` of the asset.
- **D-12:** During LinkedIn upload, the server pipes the download request stream directly to LinkedIn's PUT request (stream-to-stream) instead of loading the entire file into a memory buffer.
- **D-13:** The server deletes the temporary file from Supabase Storage immediately after a successful publish.

### Claude's Discretion
- The exact location and naming of the endpoint routes (e.g. `GET /api/media/upload/sign` or similar under `/api/media`) are left to the agent's discretion.
- Client-side error handling for failed uploads or failed URL signing is left to the agent's discretion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### LinkedIn Assets and UGC Posts API
- [UGC Posts API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin/user-generated-content-api) — Reference for UGC post schema and sharing media categories.
- [Vector Assets API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/vector-asset-api) — Reference for registering, uploading, and checking status of image/document assets.

### Supabase Storage API
- [Supabase Storage Uploads](https://supabase.com/docs/guides/storage/uploads) — Reference for client-side uploads and generating signed upload URLs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [src/services/linkedin.ts](file:///d:/Work/linkedin-agent/src/services/linkedin.ts): Already implements `publishLinkedInPost` utilizing the `ugcPosts` API endpoint.
- [src/app/api/publish/route.ts](file:///d:/Work/linkedin-agent/src/app/api/publish/route.ts): Handles client-side publish requests and triggers `agent.invoke`.
- [src/components/EditorPanel.tsx](file:///d:/Work/linkedin-agent/src/components/EditorPanel.tsx): The draft post editor interface.
- [src/components/LinkedInFeed.tsx](file:///d:/Work/linkedin-agent/src/components/LinkedInFeed.tsx): Visual LinkedIn feed post simulator.
- [src/services/supabase.ts](file:///d:/Work/linkedin-agent/src/services/supabase.ts): Contains functions for creating request-scoped clients and verifying auth.

### Established Patterns
- Client-server payload communication via JSON requests.
- Next.js serverless route handlers.

### Integration Points
- `/api/publish` endpoint payload needs to accept the new file metadata containing `storagePath`.
- `publishLinkedInPost` signature in `src/services/linkedin.ts` needs to retrieve the file from Supabase and stream it to LinkedIn.
- A new route handler `src/app/api/media/upload/sign/route.ts` is required to generate signed upload URLs.
- Client-side components like `EditorPanel.tsx` need to upload files immediately to Supabase Storage when selected.

</code_context>

<specifics>
## Specific Ideas

- Show a progress indicator on the frontend while uploading the file to Supabase.
- Store the uploaded file's readUrl in client state to render the preview.

</specifics>

<deferred>
## Deferred Ideas

- Supporting multiple images / carousel posts (out of scope for Phase 6).
- Supporting doc files other than PDF (Word, PPTX, etc.).

</deferred>

---

*Phase: 06-file-image-uploading-feature-after-post-generation*
*Context gathered: 2026-07-03*
