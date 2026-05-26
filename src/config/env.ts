import * as dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  GOOGLE_API_KEY: string;
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_PERSON_URN: string;
  TOPIC?: string;
  CONTEXT: string;
  DRY_RUN: boolean;
}

export function loadConfig(): AppConfig {
  const { GOOGLE_API_KEY, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, TOPIC, CONTEXT, DRY_RUN } = process.env;

  if (!GOOGLE_API_KEY) {
    throw new Error("Missing GOOGLE_API_KEY environment variable.");
  }
  if (!LINKEDIN_ACCESS_TOKEN) {
    throw new Error("Missing LINKEDIN_ACCESS_TOKEN environment variable.");
  }
  if (!LINKEDIN_PERSON_URN) {
    throw new Error("Missing LINKEDIN_PERSON_URN environment variable.");
  }

  return {
    GOOGLE_API_KEY,
    LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_PERSON_URN,
    TOPIC,
    CONTEXT: CONTEXT || "",
    DRY_RUN: DRY_RUN === "true",
  };
}

export const config = loadConfig();
