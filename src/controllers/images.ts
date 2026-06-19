import type { Request, Response } from "express";
import { createLLM } from "../services/llm.js";
import { HumanMessage } from "@langchain/core/messages";

export const generateImagePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draft } = req.body;
    if (!draft) { res.status(400).json({ error: "Missing draft content" }); return; }

    const provider = req.headers["x-llm-provider"] as string | undefined;
    const apiKey = req.headers["x-llm-api-key"] as string | undefined;
    const model = req.headers["x-llm-model"] as string | undefined;
    const ollamaUrl = req.headers["x-ollama-base-url"] as string | undefined;
    const llm = createLLM({ provider, apiKey, model, ollamaBaseUrl: ollamaUrl });

    const prompt = `Based on this LinkedIn post, generate a short, detailed, single-sentence image generation prompt representing its technical concept in a modern, clean, minimalist 3D vector illustration or abstract tech style. Avoid introductory text, quotes, or formatting. Just output the prompt text.\n\nPost content:\n${draft}`;

    const response = await llm.invoke([new HumanMessage(prompt)]);
    const cleanPrompt = (response.content as string).replace(/["']/g, "").trim();
    const encoded = encodeURIComponent(cleanPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=450&nologo=true`;

    console.log(`[API] Image Generated. Prompt: "${cleanPrompt}"`);
    res.status(200).json({ imageUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Image Generation failed: ${msg}`);
    res.status(500).json({ error: msg });
  }
};
