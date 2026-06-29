# Phase 6: File/image uploading feature after post generation - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Enables the user to upload a single image (JPEG, PNG, WebP) or document (PDF) after generating a post, preview it in the editor and in high fidelity in the LinkedIn feed preview, and publish it to LinkedIn alongside the post content using the "Upload on Publish" pattern.

</domain>

<decisions>
## Implementation Decisions

### Storage & Upload Flow
- **D-01:** Upload on Publish. When the user clicks "Approve & Publish", the client-side file data (base64) is sent alongside the post content to the server-side API `/api/publish`.
- **D-02:** The server-side API handles registering the upload with LinkedIn, uploading the binary file content, getting the media asset URN, and then creating the UGC post referencing this asset URN.

### UI Integration & Feed Previews
- **D-03:** A file input is placed in the Editor panel allowing the user to select an image or PDF. Once selected, a thumbnail preview and "Remove" button are shown in the Editor.
- **D-04:** The LinkedIn Feed preview tab is updated to render the uploaded image (or a PDF preview/icon) below the post commentary, matching LinkedIn's UI.

### Supported Formats & Limits
- **D-05:** Supports images (JPEG, PNG, WebP) and documents (PDF) up to 4MB.
- **D-06:** For images, uses recipe `urn:li:digitalmediaRecipe:feedshare-image` and category `IMAGE`. For documents/PDFs, uses recipe `urn:li:digitalmediaRecipe:document-preview` and category `NATIVE_DOCUMENT`.
- **D-07:** Limit of a single file upload per post.

### Agent's Discretion
- The exact layout design of the file upload button and preview UI is left to the agent's discretion, as long as it matches the premium aesthetic of the existing UI.
- The base64 file parsing/upload error messages are left to the agent's discretion to design.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### LinkedIn Assets and UGC Posts API
- [UGC Posts API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin/user-generated-content-api) — Reference for UGC post schema and sharing media categories.
- [Vector Assets API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/vector-asset-api) — Reference for registering, uploading, and checking status of image/document assets.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [src/services/linkedin.ts](file:///d:/Work/linkedin-agent/src/services/linkedin.ts): Already implements `publishLinkedInPost` utilizing the `ugcPosts` API endpoint.
- [src/app/api/publish/route.ts](file:///d:/Work/linkedin-agent/src/app/api/publish/route.ts): Handles client-side publish requests and triggers `agent.invoke`.
- [src/components/EditorPanel.tsx](file:///d:/Work/linkedin-agent/src/components/EditorPanel.tsx): The draft post editor interface.
- [src/components/LinkedInFeed.tsx](file:///d:/Work/linkedin-agent/src/components/LinkedInFeed.tsx): Visual LinkedIn feed post simulator.

### Established Patterns
- Client-server payload communication via JSON requests.
- Next.js serverless route handlers (`/api/publish`, `/api/draft`).

### Integration Points
- `/api/publish` endpoint payload needs to accept optional base64 file data and file type metadata.
- `publishLinkedInPost` signature in `src/services/linkedin.ts` needs to be extended to support uploading the file to LinkedIn.
- `useAgent` hook in `src/hooks/useAgent.ts` needs to store the selected file state and pass it when calling `publishPost`.

</code_context>

<specifics>
## Specific Ideas

- Show an image preview in the feed preview tab using an `<img>` tag with the local object URL or data URL representation of the file.
- If a PDF is uploaded, display a document icon and file name in the preview.

</specifics>

<deferred>
## Deferred Ideas

- Supporting multiple images / carousel posts (out of scope for Phase 6).
- Supporting doc files other than PDF (Word, PPTX, etc.).

</deferred>

---
*Phase: 06-file-image-uploading-feature-after-post-generation*
*Context gathered: 2026-06-29*
