import { Router } from "express";
import { getTopics, generateDraft } from "../controllers/posts.js";
import { publishDraft } from "../controllers/publish.js";
import { generateImagePrompt } from "../controllers/images.js";

const router = Router();

router.get("/topics", getTopics);
router.post("/draft", generateDraft);
router.post("/publish", publishDraft);
router.post("/generate-image", generateImagePrompt);

export const postsRouter = router;
