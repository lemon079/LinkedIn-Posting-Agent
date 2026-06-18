import type { Request, Response } from "express";
import { agent } from "../graph/index.js";
import { config } from "../config/env.js";
import { genres } from "../core/utils.js";

export const getTopics = (req: Request, res: Response): void => {
  res.status(200).json(genres);
};

export const generateDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, context } = req.body;
    const selectedTopic = topic || genres[Math.floor(Math.random() * genres.length)];
    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };
    const initialState = {
      topic: selectedTopic,
      context: context !== undefined ? context : config.CONTEXT,
      postContent: null,
      postUrl: null,
      retries: 0,
      error: null,
    };

    console.log(`[API] Drafting: "${selectedTopic}" (ID: ${threadId})`);
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

export const publishDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId, draft } = req.body;
    if (!threadId || !draft) {
      res.status(400).json({ error: "Missing threadId or draft" });
      return;
    }
    const threadConfig = { configurable: { thread_id: threadId } };
    const state = await agent.getState(threadConfig);
    const nextNode = state.next?.[0];

    if (!state.values || nextNode !== "publishPost") {
      res.status(400).json({ error: "Invalid thread or post already published" });
      return;
    }

    console.log(`[API] Resuming thread ID ${threadId}...`);
    await agent.updateState(threadConfig, { postContent: draft });
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
