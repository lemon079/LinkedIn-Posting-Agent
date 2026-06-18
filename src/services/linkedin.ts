import { config } from "../config/env.js";

export interface PublishPostResponse {
  postUrl?: string;
  error?: string;
}

export async function publishLinkedInPost(postContent: string, dryRunOverride?: boolean): Promise<PublishPostResponse> {
  const isDryRun = dryRunOverride !== undefined ? dryRunOverride : config.DRY_RUN;
  if (isDryRun) {
    console.log("[DRY RUN] Would have published to LinkedIn:", postContent);
    return { postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:mock_dry_run_id" };
  }

  const url = "https://api.linkedin.com/v2/ugcPosts";
  
  const payload = {
    author: config.LINKEDIN_PERSON_URN,
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
        "Authorization": `Bearer ${config.LINKEDIN_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201) {
      const linkedinId = response.headers.get("x-linkedin-id");
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
