# Phase 6 Research: File/image uploading feature after post generation

## Objective
Research the technical requirements, API requests, and frontend/backend integration pattern for uploading images and PDF documents to LinkedIn and publishing them alongside generated posts.

## LinkedIn API Specifications

### 1. Register Upload Request
To upload an asset, we must first register the upload using the LinkedIn Assets API:
- **Endpoint**: `POST https://api.linkedin.com/v2/assets?action=registerUpload`
- **Headers**:
  - `Authorization: Bearer {token}`
  - `Content-Type: application/json`
  - `X-Restli-Protocol-Version: 2.0.0`
- **Request Body (Image)**:
  ```json
  {
    "registerUploadRequest": {
      "recipes": [
        "urn:li:digitalmediaRecipe:feedshare-image"
      ],
      "owner": "urn:li:person:{PERSON_URN}",
      "serviceRelationships": [
        {
          "relationshipType": "OWNER",
          "identifier": "urn:li:userGeneratedContent"
        }
      ]
    }
  }
  ```
- **Request Body (PDF/Document)**:
  ```json
  {
    "registerUploadRequest": {
      "recipes": [
        "urn:li:digitalmediaRecipe:document-preview"
      ],
      "owner": "urn:li:person:{PERSON_URN}",
      "serviceRelationships": [
        {
          "relationshipType": "OWNER",
          "identifier": "urn:li:userGeneratedContent"
        }
      ]
    }
  }
  ```

- **Response Schema**:
  ```json
  {
    "value": {
      "asset": "urn:li:digitalmediaAsset:C5622AQGXY...",
      "uploadMechanism": {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
          "uploadUrl": "https://api.linkedin.com/mediaUpload/...",
          "headers": {}
        }
      }
    }
  }
  ```

### 2. Binary File Upload
The actual upload is a raw binary `PUT` request to the pre-signed `uploadUrl`:
- **Method**: `PUT`
- **Endpoint**: `{uploadUrl}`
- **Headers**:
  - `Content-Type: application/octet-stream` (or specific MIME type like `image/png`, `application/pdf`)
  - **Do NOT include the Authorization header** in this call as it will cause a signature mismatch error.
- **Request Body**: Raw binary data of the file.

### 3. UGC Post Payload
Once the file is uploaded, the asset URN is referenced in the `/v2/ugcPosts` payload:
- **Endpoint**: `POST https://api.linkedin.com/v2/ugcPosts`
- **shareMediaCategory**:
  - `"IMAGE"` for images.
  - `"NATIVE_DOCUMENT"` for PDF documents.
- **Media Object Array**:
  ```json
  "media": [
    {
      "status": "READY",
      "description": { "text": "Post media asset" },
      "media": "urn:li:digitalmediaAsset:{ASSET_ID}",
      "title": { "text": "{FILENAME}" }
    }
  ]
  ```

## Frontend & Backend Integration Flow (Upload on Publish)

1. **User Action**: The user selects a file (Image or PDF) in the Editor panel.
2. **File Processing**: The frontend reads the file as a Base64 string (including filename and MIME type) and stores it in React state.
3. **Draft Updates**: The user can preview the image in the editor and in the simulated LinkedIn Feed tab (using the local file representation).
4. **Publish Request**: The user clicks "Approve & Publish". The frontend sends:
   ```json
   {
     "threadId": "...",
     "draft": "...",
     "file": {
       "name": "filename.png",
       "type": "image/png",
       "base64": "data:image/png;base64,iVBORw0KG..."
     }
   }
   ```
5. **Graph State Updates**: `/api/publish` endpoint updates the LangGraph thread state with `postContent`, authentication credentials, and the `mediaFile` data.
6. **Publish Node Execution**: The `publishPost` node triggers `publishLinkedInPost` in `src/services/linkedin.ts`.
7. **LinkedIn API Orchestration**:
   - The backend decodes the Base64 string to a buffer.
   - Registers the upload with LinkedIn (using the correct recipe based on file type).
   - Uploads the buffer to the LinkedIn pre-signed upload URL.
   - Creates the UGC post with the asset URN (using `IMAGE` or `NATIVE_DOCUMENT` category).

## Key Risks & Mitigations
- **Base64 Payload Size**: Vercel has a 4.5MB request body size limit. Mitigate by enforcing a strict 4MB file size limit in the frontend validation.
- **MIME Type Detection**: Properly classify files using their standard types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`). Rejection of other document formats or oversized images happens directly in the frontend.
