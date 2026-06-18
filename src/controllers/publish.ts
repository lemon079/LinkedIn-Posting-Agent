import type { Request, Response } from "express";
import { agent } from "../graph/index.js";

export const publishDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId, draft, dryRun } = req.body;
    if (!threadId || !draft) {
      res.status(400).json({ error: "Missing threadId or draft" });
      return;
    }
    const token = req.headers["x-linkedin-token"] as string | undefined;
    const urn = req.headers["x-linkedin-urn"] as string | undefined;
    const threadConfig = { configurable: { thread_id: threadId } };
    const state = await agent.getState(threadConfig);

    if (!state.values || state.next?.[0] !== "publishPost") {
      res.status(400).json({ error: "Invalid thread or post already published" });
      return;
    }

    console.log(`[API] Resuming thread ID ${threadId} (Dry Run: ${dryRun === true})...`);
    await agent.updateState(threadConfig, { 
      postContent: draft, 
      dryRun: dryRun === true,
      linkedinToken: token || null,
      linkedinUrn: urn || null,
    });
    const finalState = await agent.invoke(null, threadConfig);

    if (finalState.error) {
      res.status(500).json({ error: finalState.error });
      return;
    }
    console.log(`[API] Post published! URL: ${finalState.postUrl}`);
    res.status(200).json({ postUrl: finalState.postUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Publishing failed: ${msg}`);
    res.status(500).json({ error: msg });
  }
};
