import { Router } from "express";
import { getTopics, generateDraft, publishDraft } from "../controllers/posts.js";

const router = Router();

router.get("/topics", getTopics);
router.post("/draft", generateDraft);
router.post("/publish", publishDraft);

export const postsRouter = router;
