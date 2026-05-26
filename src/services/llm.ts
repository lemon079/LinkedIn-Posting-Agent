import { ChatGoogle } from "@langchain/google";
import { config } from "../config/env.js";

export const createLLM = () => {
  const llm = new ChatGoogle({ 
    model: "gemini-2.5-flash", 
    temperature: 0.9,
    maxRetries: 2,
    apiKey: config.GOOGLE_API_KEY
  });
  
  return llm.bindTools([
    {
      googleSearch: {}
    }
  ]);
};
