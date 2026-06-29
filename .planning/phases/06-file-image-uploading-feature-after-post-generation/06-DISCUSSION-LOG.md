# Phase 6: File/image uploading feature after post generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 6-file-image-uploading-feature-after-post-generation
**Areas discussed:** Storage & Upload flow, UI Integration & Feed Previews, Supported Formats & Limits, File quantity limits

---

## Storage & Upload Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate Upload to LinkedIn | The user selects a file, it is immediately uploaded to LinkedIn via our API server. | |
| Upload on Publish | Only uploads to LinkedIn when publishing the post, avoiding unused assets. | ✓ |

**User's choice:** Upload on Publish
**Notes:** User chose to only upload to LinkedIn when publishing the post to avoid creating unused media assets on LinkedIn.

---

## UI Integration & Feed Previews

| Option | Description | Selected |
|--------|-------------|----------|
| File Input in Editor, Image/File Preview in Feed | Select file in Editor, show thumbnail preview in Editor, and render the high-fidelity preview in the LinkedIn Feed preview tab. | ✓ |
| Editor-Only Preview | File input and thumbnail shown in Editor; Feed preview remains text-only. | |

**User's choice:** File Input in Editor, Image/File Preview in Feed
**Notes:** Enables a high-fidelity preview of the image/document directly in the simulated LinkedIn feed.

---

## Supported Formats & Limits

| Option | Description | Selected |
|--------|-------------|----------|
| Images only (JPEG, PNG, WebP) up to 4MB | Simplifies implementation, fits safely within Vercel's payload limits. | |
| Images & Documents (JPEG, PNG, WebP, PDF) up to 4MB | Enables sharing slide decks/PDFs as well as images, using LinkedIn's document asset type. | ✓ |

**User's choice:** Images & Documents (JPEG, PNG, WebP, PDF) up to 4MB
**Notes:** User chose to support both images and PDF documents up to 4MB.

---

## File Quantity Limits

| Option | Description | Selected |
|--------|-------------|----------|
| Single file/image limit | Simplifies UX and UI preview logic, covers most use cases. | ✓ |
| Multiple files/images limit | Allows uploading a carousel/slideshow of images, needing a slider or grid in the preview UI. | |

**User's choice:** Single file/image limit
**Notes:** User selected a single file/image limit to simplify the interface and MVP logic.

---

## Agent's Discretion

- Visual design of the upload button and thumbnail elements.
- Error handling text and display mechanism for invalid file types/sizes.

## Deferred Ideas

- Supporting multiple images / carousel posts.
- Supporting doc formats other than PDF.
