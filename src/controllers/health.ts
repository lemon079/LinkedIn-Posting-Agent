import type { Request, Response } from "express";
import { checkConnection } from "../services/health.js";

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, apiKey, model, ollamaBaseUrl } = req.body;
    if (!provider) {
      res.status(400).json({ ok: false, error: "Missing provider" });
      return;
    }
    const result = await checkConnection(provider, apiKey, model, ollamaBaseUrl);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Health check failed";
    res.status(500).json({ ok: false, error: msg });
  }
};
