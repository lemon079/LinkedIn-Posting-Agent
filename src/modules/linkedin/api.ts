import type {
  PublishResponse,
  LinkedInRegisterUploadRequest,
  LinkedInShareContent,
  LinkedInUGCPostPayload,
} from "./types";
import type { MediaFileMetadata } from "@/modules/media/types";
import axios from "axios";
import { config } from "@/config/env";
import { logger } from "@/lib/logger";
import { sanitizeUrl, redactSecrets } from "@/lib/utils";

const log = logger.child({ module: "LinkedInAPI" });

function getAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    return `${status}: ${typeof data === "object" ? JSON.stringify(data) : String(data || err.message)}`;
  }
  return redactSecrets(String(err));
}

async function registerUpload(mediaFile: MediaFileMetadata, authorUrn: string, token: string) {
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
          identifier: "urn:li:userGeneratedContent",
        },
      ],
      supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
    },
  };

  log.info(`Registering upload for media asset`, { fileName: mediaFile.name, mimeType: mediaFile.type, authorUrn });
  try {
    const registerResponse = await axios.post(registerUrl, registerPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
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
      throw new Error(
        `LinkedIn registerUpload response was missing upload URL or asset URN for "${mediaFile.name}"`
      );
    }

    log.info(`Upload registered successfully`, { mediaUrn, fileName: mediaFile.name });
    return { uploadUrl, mediaUrn };
  } catch (err: unknown) {
    const errMsg = getAxiosError(err);
    log.error(`registerUpload failed for ${mediaFile.name}`, { error: errMsg, fileName: mediaFile.name });
    throw new Error(`LinkedIn registerUpload failed for "${mediaFile.name}": ${errMsg}`);
  }
}

async function uploadBinary(mediaFile: MediaFileMetadata, uploadUrl: string) {
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

  log.info(`Uploading binary data`, {
    fileName: mediaFile.name,
    targetUrl: sanitizeUrl(uploadUrl),
    bytes: bodyData.byteLength,
  });

  try {
    await axios.put(uploadUrl, bodyData, {
      headers: {
        "Content-Type": mediaFile.type,
      },
    });
    log.info(`Binary upload completed successfully`, { fileName: mediaFile.name });
    return { success: true };
  } catch (err: unknown) {
    const errMsg = getAxiosError(err);
    log.error(`Binary upload failed for ${mediaFile.name}`, { error: errMsg, fileName: mediaFile.name });
    throw new Error(`LinkedIn file binary upload failed for "${mediaFile.name}": ${errMsg}`);
  }
}

async function pollAssetStatus(mediaUrn: string, token: string, maxRetries = 3) {
  const assetId = mediaUrn.replace(/^urn:li:digitalmediaAsset:/, "");
  log.info(`Checking asset availability`, { assetId });
  let lastStatus = "UNKNOWN";

  for (let i = 0; i < maxRetries; i++) {
    try {
      const assetRes = await axios.get(`https://api.linkedin.com/v2/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });
      const status = assetRes.data?.recipes?.[0]?.status;

      if (status !== lastStatus) {
        log.debug(`Asset status changed`, { assetId, status, attempt: i + 1 });
        lastStatus = status;
      }

      if (status === "AVAILABLE") {
        log.info(`Asset is available`, { assetId, attempts: i + 1 });
        return { isAvailable: true };
      } else if (
        status === "PROCESSING_FAILED" ||
        status === "CLIENT_ERROR" ||
        status === "SERVER_ERROR"
      ) {
        log.error(`Asset processing failed`, { assetId, status });
        throw new Error(`Asset processing failed for "${mediaUrn}" (Status: ${status}).`);
      }
    } catch (err: unknown) {
      if (err instanceof Error && !axios.isAxiosError(err)) {
        throw err;
      }
      log.debug(`Asset polling note`, { assetId, status: getAxiosError(err) });
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  log.info(`Asset ready after synchronous upload confirmation`, { mediaUrn });
  return { isAvailable: true };
}

async function createUgcPost(
  postContent: string,
  authorUrn: string,
  token: string,
  shareMediaCategory: string,
  mediaUrns: string[],
  mediaFiles: MediaFileMetadata[]
) {
  const shareContent: LinkedInShareContent = {
    shareCommentary: { text: postContent },
    shareMediaCategory,
  };

  if (mediaUrns.length > 0 && shareMediaCategory !== "NONE") {
    shareContent.media = mediaUrns.map((urn, idx) => {
      const mediaFile = mediaFiles[idx];
      return {
        status: "READY",
        media: urn,
        title: { text: mediaFile?.name || "Attachment" },
      };
    });
  }

  const payload: LinkedInUGCPostPayload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent,
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  log.info(`Creating LinkedIn UGC post`, {
    authorUrn,
    mediaCategory: shareMediaCategory,
    mediaCount: mediaUrns.length,
    contentLengthChars: postContent.length,
  });

  try {
    const response = await axios.post("https://api.linkedin.com/v2/ugcPosts", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (response.status === 201) {
      const linkedinId =
        response.headers["x-restli-id"] ||
        response.headers["x-linkedin-id"] ||
        response.data?.id;

      let postUrl = "https://www.linkedin.com/";
      if (linkedinId) {
        if (linkedinId.startsWith("urn:li:share") || linkedinId.startsWith("urn:li:ugcPost")) {
          postUrl = `https://www.linkedin.com/feed/update/${linkedinId}/`;
        } else {
          postUrl = `https://www.linkedin.com/feed/update/urn:li:share:${linkedinId}/`;
        }
      }
      log.info(`LinkedIn post published successfully`, { postUrl, linkedinId });
      return { postUrl };
    } else {
      throw new Error(`LinkedIn API error: expected 201, got ${response.status}`);
    }
  } catch (err: unknown) {
    const errMsg = getAxiosError(err);
    log.error(`LinkedIn UGC post creation failed`, { error: errMsg });
    throw new Error(`LinkedIn API error: ${errMsg}`);
  }
}

export async function publishLinkedInPost(
  postContent: string,
  customToken?: string,
  customUrn?: string,
  mediaFiles?: Array<MediaFileMetadata>
): Promise<PublishResponse> {
  const rawAuthorUrn = customUrn || config.LINKEDIN_PERSON_URN;
  if (!rawAuthorUrn) {
    return { error: "Missing LinkedIn author URN." };
  }
  const authorUrn = rawAuthorUrn.startsWith("urn:li:")
    ? rawAuthorUrn
    : `urn:li:person:${rawAuthorUrn}`;

  const token = customToken || config.LINKEDIN_ACCESS_TOKEN;
  if (!token) {
    return { error: "Missing LinkedIn OAuth token." };
  }

  const mediaUrns: string[] = [];
  let shareMediaCategory = "NONE";

  const startTime = Date.now();

  try {
    if (mediaFiles && mediaFiles.length > 0) {
      const hasDocument = mediaFiles.some((f) => !f.type.startsWith("image/"));
      shareMediaCategory = hasDocument ? "DOCUMENT" : "IMAGE";

      for (const mediaFile of mediaFiles) {
        const { uploadUrl, mediaUrn } = await registerUpload(mediaFile, authorUrn, token);
        await uploadBinary(mediaFile, uploadUrl);
        await pollAssetStatus(mediaUrn, token);
        mediaUrns.push(mediaUrn);
      }
    }

    const result = await createUgcPost(
      postContent,
      authorUrn,
      token,
      shareMediaCategory,
      mediaUrns,
      mediaFiles || []
    );

    log.info(`Total publish workflow completed`, {
      durationMs: Date.now() - startTime,
      postUrl: result.postUrl,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`Publish workflow failed`, { error: msg, durationMs });
    return { error: msg };
  }
}
