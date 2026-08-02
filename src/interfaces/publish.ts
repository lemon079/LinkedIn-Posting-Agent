export interface MediaFileMetadata {
  name: string;
  type: string;
  storagePath?: string;
  readUrl?: string;
  base64?: string;
}

export interface PublishRequest {
  threadId: string;
  draft: string;
  files?: MediaFileMetadata[] | null;
}

export interface PublishResponse {
  postUrl?: string;
  error?: string;
}

export interface PublishPostResponse {
  postUrl?: string;
  error?: string;
}

export interface LinkedInRegisterUploadRequest {
  registerUploadRequest: {
    recipes: string[];
    owner: string;
    serviceRelationships: Array<{
      relationshipType: string;
      identifier: string;
    }>;
    supportedUploadMechanism: string[];
  };
}

export interface LinkedInMediaShareItem {
  status: "READY";
  media: string;
  title?: { text: string };
}

export interface LinkedInShareContent {
  shareCommentary: { text: string };
  shareMediaCategory: string;
  media?: LinkedInMediaShareItem[];
}

export interface LinkedInUGCPostPayload {
  author: string;
  lifecycleState: "PUBLISHED";
  specificContent: {
    "com.linkedin.ugc.ShareContent": LinkedInShareContent;
  };
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC";
  };
}
