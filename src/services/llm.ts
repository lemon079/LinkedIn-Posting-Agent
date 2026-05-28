import { ChatGoogle } from "@langchain/google";
import { config } from "../config/env.js";

export const createLLM = () => {
  return new ChatGoogle({ 
    model: "gemini-2.5-flash", 
    temperature: 0.9,
    maxRetries: 2,
    apiKey: config.GOOGLE_API_KEY
  });
};
