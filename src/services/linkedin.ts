import type {
  PublishPostResponse,
  LinkedInRegisterUploadRequest,
  LinkedInShareContent,
  LinkedInUGCPostPayload,
} from "@/interfaces";
import axios from "axios";
import { config } from "@/config/env";

function getAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return `${err.response?.status}: ${JSON.stringify(err.response?.data)}`;
  }
  return String(err);
}

interface MediaFile {
  name: string;
  type: string;
  storagePath?: string;
  readUrl?: string;
  base64?: string;
}

async function registerUpload(mediaFile: MediaFile, authorUrn: string, token: string) {
  const isImage = mediaFile.type.startsWith("image/");
  const recipe = isImage
    ? "urn:li:digitalmediaRecipe:feedshare-image"
    : "urn:li:digitalmediaRecipe:feedshare-document";

  const registerUrl = "https://api.linkedin.com/v2/assets?action=registerUpload";
  const registerPayload: LinkedInRegisterUploadRequest = {
    registerUploadRequest: {
      recipes: [recipe],
      owner: authorUrn,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent"
        }
      ],
      supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]
    }
  };



  console.log(`\x1b[36m[LinkedIn API] -> registerUpload for ${mediaFile.name}\x1b[0m`);
  try {
    const registerResponse = await axios.post(registerUrl, registerPayload, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      }
    });
    
    const registerData = registerResponse.data;
    if (!registerData?.value) {
      throw new Error("Invalid registerUpload response from LinkedIn (missing value).");
    }

    const uploadUrl = registerData.value.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
    const mediaUrn = registerData.value.asset;

    if (!uploadUrl || !mediaUrn) {
      throw new Error(`LinkedIn registerUpload response was missing upload URL or asset URN for "${mediaFile.name}"`);
    }

    console.log(`\x1b[32m[LinkedIn API] <- registerUpload Success! URN: ${mediaUrn}\x1b[0m`);
    return { uploadUrl, mediaUrn };
  } catch (err: unknown) {
    console.error(`\x1b[31m[LinkedIn API] <- registerUpload FAILED for ${mediaFile.name}: ${getAxiosError(err)}\x1b[0m`);
    throw new Error(`LinkedIn registerUpload failed for "${mediaFile.name}": ${getAxiosError(err)}`);
  }
}

async function uploadBinary(mediaFile: MediaFile, uploadUrl: string) {
  let bodyData: ArrayBuffer | Uint8Array;
  
  if (mediaFile.readUrl) {
    const downloadRes = await axios.get(mediaFile.readUrl, { responseType: "arraybuffer" });
    bodyData = downloadRes.data;
  } else if (mediaFile.base64) {
    const base64Data = mediaFile.base64.split(",")[1] || mediaFile.base64;
    const binaryString = atob(base64Data);
    bodyData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bodyData[i] = binaryString.charCodeAt(i);
    }
  } else {
    throw new Error(`mediaFile "${mediaFile.name}" is missing both readUrl and base64 data`);
  }

  console.log(`\x1b[36m[LinkedIn API] -> uploading binary to ${uploadUrl}\x1b[0m`);
  try {
    await axios.put(uploadUrl, bodyData, {
      headers: {
        "Content-Type": mediaFile.type,
      }
    });
    console.log(`\x1b[32m[LinkedIn API] <- binary upload Success!\x1b[0m`);
    return { success: true };
  } catch (err: unknown) {
    console.error(`\x1b[31m[LinkedIn API] <- binary upload FAILED for ${mediaFile.name}: ${getAxiosError(err)}\x1b[0m`);
    throw new Error(`LinkedIn file binary upload failed for "${mediaFile.name}": ${getAxiosError(err)}`);
  }
}

async function pollAssetStatus(mediaUrn: string, token: string, maxRetries = 15) {
  console.log(`\x1b[36m[LinkedIn API] -> polling asset status for ${mediaUrn}\x1b[0m`);
  let lastStatus = "UNKNOWN";
  
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const assetRes = await axios.get(`https://api.linkedin.com/v2/assets/${mediaUrn}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      });
      const status = assetRes.data?.recipes?.[0]?.status;
      lastStatus = status;
      console.log(`\x1b[33m[LinkedIn API] Polling ${mediaUrn}... Status: ${status}\x1b[0m`);
      
      if (status === "AVAILABLE") {
        console.log(`\x1b[32m[LinkedIn API] <- Asset ${mediaUrn} is AVAILABLE!\x1b[0m`);
        return { isAvailable: true };
      } else if (status === "PROCESSING_FAILED" || status === "CLIENT_ERROR" || status === "SERVER_ERROR") {
        console.error(`\x1b[31m[LinkedIn API] <- Asset ${mediaUrn} failed processing: ${status}\x1b[0m`);
        throw new Error(`Asset processing failed for "${mediaUrn}" (Status: ${status}).`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      console.error(`Error polling asset ${mediaUrn}: ${getAxiosError(err)}`);
    }
  }
  
  throw new Error(`LinkedIn asset processing timed out for "${mediaUrn}" (Last status: ${lastStatus}).`);
}

async function createUgcPost(
  postContent: string, 
  authorUrn: string, 
  token: string, 
  shareMediaCategory: string, 
  mediaUrns: string[], 
  mediaFiles: MediaFile[]
) {
  const shareContent: LinkedInShareContent = {
    shareCommentary: { text: postContent },
    shareMediaCategory,
  };

  if (mediaUrns.length > 0) {
    shareContent.media = mediaUrns.map((urn, idx) => {
      const mediaFile = mediaFiles[idx];
      return {
        status: "READY",
        media: urn,
        title: { text: mediaFile?.name || "Attachment" }
      };
    });
  }

  const payload: LinkedInUGCPostPayload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  console.log(`\x1b[36m[LinkedIn API] -> ugcPosts (Create Post)\x1b[0m`);
  try {
    const response = await axios.post("https://api.linkedin.com/v2/ugcPosts", payload, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      }
    });

    if (response.status === 201) {
      console.log(`\x1b[32m[LinkedIn API] <- ugcPosts Success!\x1b[0m`);
      const linkedinId = response.headers["x-restli-id"] || response.headers["x-linkedin-id"] || response.data?.id;
      
      let postUrl = "https://www.linkedin.com/";
      if (linkedinId) {
        if (linkedinId.startsWith("urn:li:share") || linkedinId.startsWith("urn:li:ugcPost")) {
          postUrl = `https://www.linkedin.com/feed/update/${linkedinId}/`;
        } else {
          // Fallback if just raw ID
          postUrl = `https://www.linkedin.com/feed/update/urn:li:share:${linkedinId}/`;
        }
      }
      return { postUrl };
    } else {
      throw new Error(`LinkedIn API error: expected 201, got ${response.status}`);
    }
  } catch (err: unknown) {
    console.error(`\x1b[31m[LinkedIn API] <- ugcPosts FAILED: ${getAxiosError(err)}\x1b[0m`);
    throw new Error(`LinkedIn API error: ${getAxiosError(err)}`);
  }
}

export async function publishLinkedInPost(
  postContent: string, 
  customToken?: string,
  customUrn?: string,
  mediaFiles?: Array<MediaFile>
): Promise<PublishPostResponse> {
  const authorUrn = customUrn || config.LINKEDIN_PERSON_URN;
  const token = customToken || config.LINKEDIN_ACCESS_TOKEN;
  
  const mediaUrns: string[] = [];
  let shareMediaCategory = "NONE";

  try {
    if (mediaFiles && mediaFiles.length > 0) {
      const hasDocument = mediaFiles.some(f => !f.type.startsWith("image/"));
      shareMediaCategory = hasDocument ? "DOCUMENT" : "IMAGE";

      for (const mediaFile of mediaFiles) {
        // Step 1 & 2: Register
        const { uploadUrl, mediaUrn } = await registerUpload(mediaFile, authorUrn, token);
        
        // Step 3 & 4: Upload Binary
        await uploadBinary(mediaFile, uploadUrl);
        
        // Step 5: Poll
        await pollAssetStatus(mediaUrn, token);
        
        mediaUrns.push(mediaUrn);
      }
    }

    return await createUgcPost(postContent, authorUrn, token, shareMediaCategory, mediaUrns, mediaFiles || []);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: String(error) };
  }
}


