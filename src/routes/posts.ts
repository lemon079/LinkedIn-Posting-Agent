import { Router } from "express";
import { getTopics, generateDraft } from "../controllers/posts.js";
import { publishDraft } from "../controllers/publish.js";
import { generateImagePrompt } from "../controllers/images.js";
import { healthCheck } from "../controllers/health.js";

const router = Router();

router.get("/topics", getTopics);
router.post("/draft", generateDraft);
router.post("/publish", publishDraft);
router.post("/generate-image", generateImagePrompt);
router.post("/health-check", healthCheck);

export const postsRouter = router;
