import type { Request, Response } from "express";
import { createLLM } from "../services/llm.js";
import { HumanMessage } from "@langchain/core/messages";

export const generateImagePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draft } = req.body;
    if (!draft) {
      res.status(400).json({ error: "Missing draft content" });
      return;
    }
    const llm = createLLM();
    const prompt = `Based on this LinkedIn post, generate a short, detailed, single-sentence image generation prompt representing its technical concept in a modern, clean, minimalist 3D vector illustration or abstract tech style. Avoid introductory text, quotes, or formatting. Just output the prompt text.

Post content:
${draft}`;
    
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
