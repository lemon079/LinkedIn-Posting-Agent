import { Router } from "express";
import {
  redirectToLinkedIn,
  handleLinkedInCallback,
  getUserSettings,
  saveUserSettings
} from "../controllers/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// LinkedIn OAuth redirects and token callbacks
router.get("/auth/linkedin", redirectToLinkedIn);
router.get("/auth/linkedin/callback", handleLinkedInCallback);

// User database settings sync routes (requires auth check)
router.get("/user/settings", requireAuth, getUserSettings);
router.post("/user/settings", requireAuth, saveUserSettings);

export const authRouter = router;
