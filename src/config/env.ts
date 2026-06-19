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

  return {
    GOOGLE_API_KEY: GOOGLE_API_KEY || "",
    LINKEDIN_ACCESS_TOKEN: LINKEDIN_ACCESS_TOKEN || "",
    LINKEDIN_PERSON_URN: LINKEDIN_PERSON_URN || "",
    TOPIC,
    CONTEXT: CONTEXT || "",
    DRY_RUN: DRY_RUN === "true",
  };
}

export const config = loadConfig();
