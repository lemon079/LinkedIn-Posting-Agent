import type { Request, Response } from "express";
import { agent } from "../graph/index.js";
import { config } from "../config/env.js";
import { genres } from "../core/utils.js";

export const getTopics = (req: Request, res: Response): void => {
  res.status(200).json(genres);
};

export const generateDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, context, dryRun } = req.body;
    const selectedTopic = topic || genres[Math.floor(Math.random() * genres.length)];
    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };
    
    const provider = req.headers["x-llm-provider"] as string | undefined;
    const apiKey = req.headers["x-llm-api-key"] as string | undefined;
    const linkedinToken = req.headers["x-linkedin-token"] as string | undefined;
    const linkedinUrn = req.headers["x-linkedin-urn"] as string | undefined;

    const initialState = {
      topic: selectedTopic,
      context: context !== undefined ? context : config.CONTEXT,
      postContent: null,
      postUrl: null,
      retries: 0,
      error: null,
      dryRun: dryRun === true,
      llmProvider: provider || null,
      llmApiKey: apiKey || null,
      linkedinToken: linkedinToken || null,
      linkedinUrn: linkedinUrn || null,
    };

    console.log(`[API] Drafting: "${selectedTopic}" (ID: ${threadId}, Dry Run: ${dryRun === true})`);
    await agent.invoke(initialState, threadConfig);
    const state = await agent.getState(threadConfig);
    const nextNode = state.next?.[0];

    if (state.values.error) {
      res.status(500).json({ error: state.values.error });
      return;
    }
    if (nextNode !== "publishPost") {
      res.status(500).json({ error: `Agent stopped unexpectedly. Next node: ${nextNode}` });
      return;
    }
    res.status(200).json({ threadId, draft: state.values.postContent, status: "needs_approval" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Draft failed: ${msg}`);
    res.status(500).json({ error: msg });
  }
};
