import { config } from "../config/env";

export interface PublishPostResponse {
  postUrl?: string;
  error?: string;
}

export async function publishLinkedInPost(
  postContent: string, 
  customToken?: string,
  customUrn?: string
): Promise<PublishPostResponse> {
  const url = "https://api.linkedin.com/v2/ugcPosts";
  const authorUrn = customUrn || config.LINKEDIN_PERSON_URN;
  const token = customToken || config.LINKEDIN_ACCESS_TOKEN;
  
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: postContent },
        shareMediaCategory: "NONE"
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
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
