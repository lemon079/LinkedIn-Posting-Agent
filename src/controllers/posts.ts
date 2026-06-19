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
    const model = req.headers["x-llm-model"] as string | undefined;
    const ollamaUrl = req.headers["x-ollama-base-url"] as string | undefined;
    const liToken = req.headers["x-linkedin-token"] as string | undefined;
    const liUrn = req.headers["x-linkedin-urn"] as string | undefined;

    const initialState = {
      topic: selectedTopic,
      context: context !== undefined ? context : config.CONTEXT,
      postContent: null, postUrl: null, retries: 0, error: null,
      dryRun: dryRun === true,
      llmProvider: provider || null, llmApiKey: apiKey || null,
      llmModel: model || null, ollamaBaseUrl: ollamaUrl || null,
      linkedinToken: liToken || null, linkedinUrn: liUrn || null,
    };

    console.log(`[API] Drafting: "${selectedTopic}" (ID: ${threadId}, Dry Run: ${dryRun === true})`);
    await agent.invoke(initialState, threadConfig);
    const state = await agent.getState(threadConfig);

    if (state.values.error) { res.status(500).json({ error: state.values.error }); return; }
    if (state.next?.[0] !== "publishPost") {
      res.status(500).json({ error: `Agent stopped unexpectedly. Next: ${state.next?.[0]}` });
      return;
    }
    res.status(200).json({ threadId, draft: state.values.postContent, status: "needs_approval" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Draft failed: ${msg}`);
    res.status(500).json({ error: msg });
  }
};
