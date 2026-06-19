import type { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IMAGE_GENERATION_PROMPT } from "../core/prompts.js";
import { config } from "../config/env.js";

export const generateImagePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draft } = req.body;
    if (!draft) {
      res.status(400).json({ error: "Missing draft content" });
      return;
    }

    const apiKey = (req.headers["x-llm-api-key"] as string | undefined) || config.GOOGLE_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: "Missing Gemini API key for image generation. Please configure it in Settings." });
      return;
    }

    // Initialize the Google Generative AI SDK directly
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const prompt = IMAGE_GENERATION_PROMPT.replace("{linkedin_post}", draft);

    console.log("[API] Generating native image via gemini-2.5-flash-image...");
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    });

    const candidate = response.response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part || !part.inlineData) {
      throw new Error("No image data returned from Gemini API");
    }

    const { mimeType, data } = part.inlineData;
    const imageUrl = `data:${mimeType};base64,${data}`;

    console.log(`[API] Native Image Generated successfully (${mimeType})`);
    res.status(200).json({ imageUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Image Generation failed: ${msg}`);

    if (msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded")) {
      res.status(429).json({
        error: "Google Gemini Free Tier does not support image generation. Please upgrade to a paid API key to use native graphics.",
      });
      return;
    }

    res.status(500).json({ error: msg });
  }
};
