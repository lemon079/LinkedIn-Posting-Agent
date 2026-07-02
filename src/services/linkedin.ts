import { config } from "../config/env";
import type { PublishPostResponse } from "../types/index.js";

export async function publishLinkedInPost(
  postContent: string, 
  customToken?: string,
  customUrn?: string,
  mediaFile?: { name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }
): Promise<PublishPostResponse> {
  const url = "https://api.linkedin.com/v2/ugcPosts";
  const authorUrn = customUrn || config.LINKEDIN_PERSON_URN;
  const token = customToken || config.LINKEDIN_ACCESS_TOKEN;
  
  let mediaUrn: string | undefined = undefined;
  let shareMediaCategory = "NONE";

  try {
    if (mediaFile) {
      // 1. Determine recipe and category
      const isPdf = mediaFile.type === "application/pdf";
      const recipe = isPdf 
        ? "urn:li:digitalmediaRecipe:document-preview"
        : "urn:li:digitalmediaRecipe:feedshare-image";
      
      shareMediaCategory = isPdf ? "NATIVE_DOCUMENT" : "IMAGE";

      // 2. Register upload
      const registerUrl = "https://api.linkedin.com/v2/assets?action=registerUpload";
      const registerPayload = {
        registerUploadRequest: {
          recipes: [recipe],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent"
            }
          ]
        }
      };

      const registerResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(registerPayload)
      });

      if (!registerResponse.ok) {
        const errText = await registerResponse.text();
        return { error: `LinkedIn registerUpload failed: ${registerResponse.status} - ${errText}` };
      }

      const registerData = await registerResponse.json();
      const uploadUrl = registerData.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
      mediaUrn = registerData.value?.asset;

      if (!uploadUrl || !mediaUrn) {
        return { error: "LinkedIn registerUpload response was missing upload URL or asset URN" };
      }

      // 3. Obtain media body (stream from readUrl or decode base64 buffer)
      let bodyData: BodyInit;
      if (mediaFile.readUrl) {
        console.log(`[LinkedIn-Publish] Downloading media from: ${mediaFile.readUrl}`);
        const downloadRes = await fetch(mediaFile.readUrl);
        if (!downloadRes.ok) {
          return { error: `Failed to download media file from storage readUrl: ${downloadRes.statusText}` };
        }
        bodyData = downloadRes.body || await downloadRes.arrayBuffer();
      } else if (mediaFile.base64) {
        console.log("[LinkedIn-Publish] Decoding base64 media data (local fallback).");
        const base64Data = mediaFile.base64.split(",")[1] || mediaFile.base64;
        bodyData = Buffer.from(base64Data, "base64");
      } else {
        return { error: "mediaFile is missing both readUrl and base64 data" };
      }

      // 4. Upload binary file
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: bodyData
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        return { error: `LinkedIn file binary upload failed: ${uploadResponse.status} - ${errText}` };
      }
    }

    const payload = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: postContent },
          shareMediaCategory,
          media: mediaUrn ? [
            {
              status: "READY",
              description: { text: mediaFile?.name || "Uploaded attachment" },
              media: mediaUrn,
              title: { text: mediaFile?.name || "Attachment" }
            }
          ] : undefined
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201) {
      const linkedinId = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id");
      const postUrl = linkedinId 
        ? `https://www.linkedin.com/feed/update/${linkedinId}` 
        : "https://www.linkedin.com/";
      return { postUrl };
    } else {
      const errorText = await response.text();
      return { error: `LinkedIn API error: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: String(error) };
  }
}
