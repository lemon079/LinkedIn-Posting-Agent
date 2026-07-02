# Phase 6 Research: File/image uploading feature after post generation (Supabase Storage Redesign)

## Objective
Research the technical requirements, API requests, and integration patterns for uploading images and PDF documents directly to Supabase Storage, rendering previews, streaming the bytes to the LinkedIn API during publication, and deleting the temporary file upon completion.

## Supabase Storage APIs & Configuration

### 1. Generating a Signed Upload URL
To allow the client (browser) to upload a file directly to the `temp-uploads` bucket without exposing service role/admin keys, the server-side Next.js route `/api/media/upload/sign` generates a pre-signed URL:
* **Syntax**:
  ```typescript
  const { data, error } = await supabase.storage
    .from("temp-uploads")
    .createSignedUploadUrl(storagePath);
  ```
* **Response `data`**:
  ```json
  {
    "signedUrl": "https://[project].supabase.co/storage/v1/s3/temp-uploads/...",
    "token": "...",
    "path": "temp/user_id/random-uuid.png"
  }
  ```

### 2. Client-Side Upload (Browser PUT)
The client performs a standard HTTP PUT request to the pre-signed `signedUrl` to upload the raw binary bytes:
* **Method**: `PUT`
* **Headers**:
  * `Content-Type`: `{file.type}` (e.g. `image/png`, `application/pdf`)
* **Body**: The raw `File` or `Blob` object from the file input.
* **Benefits**: File bytes are uploaded directly to Supabase, bypassing Next.js server payload and memory limitations (Vercel has a 4.5MB request limit).

### 3. Deleting Files from Storage
To clean up files after successful publishing, the Next.js API / agent calls:
```typescript
const { data, error } = await supabase.storage
  .from("temp-uploads")
  .remove([storagePath]);
```

## Security & Bucket Policies
* **Bucket Name**: `temp-uploads`
* **Access Control**: Enable Row Level Security (RLS) on the bucket.
  * **Upload (INSERT)**: Allowed only for authenticated users where their user ID matches the path prefix.
  * **Read (SELECT)**: Publicly accessible so that:
    1. The client can render the file directly from the public `readUrl` for live previews.
    2. The server-side API can fetch the file via standard HTTP request.
* **Orphan Cleanup**: Set up a database cron or bucket lifecycle policy to delete all files under `temp/` that are older than 24 hours.

## Local Mode (BYOK) Fallback
If the application is running in local mode (BYOK - Bring Your Own Keys) where `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are not set:
* The `/api/media/upload/sign` endpoint will return a response indicating local mode: `{ localMode: true }`.
* The client will fall back to reading the file as base64 (using `FileReader.readAsDataURL`) and store it in state.
* Upon clicking publish, the client will transmit the base64 string directly in the body of `/api/publish` (utilizing the legacy Base64 path).

## Streaming to LinkedIn API
When the user publishes the post:
1. The client sends `{ name, type, storagePath }` to `/api/publish`.
2. The server fetches the file from the public `readUrl` of the bucket:
   ```typescript
   const downloadRes = await fetch(readUrl);
   if (!downloadRes.ok) throw new Error("Failed to retrieve file from storage");
   ```
3. The server registers the upload with LinkedIn to obtain a LinkedIn `uploadUrl`.
4. The server pipes the body stream directly to LinkedIn's pre-signed PUT upload URL:
   ```typescript
   const uploadRes = await fetch(uploadUrl, {
     method: "PUT",
     headers: {
       "Content-Type": "application/octet-stream"
     },
     body: downloadRes.body // streams directly from Supabase request response
   });
   ```
   *Note: In Node.js 18+, passing a `ReadableStream` directly to the `body` option of `fetch` is natively supported.*

## Key Risks & Mitigations
* **Public URL Availability**: Since the server uses a standard HTTP fetch via `readUrl`, the bucket must allow public read access. If security requirements change, the server can download using the authenticated admin client instead.
* **Failure to Publish Cleanup**: If publishing fails, the file remains in storage. The 24-hour cleanup cron mitigates storage creep.
