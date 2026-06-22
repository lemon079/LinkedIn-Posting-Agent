import { Request, Response, NextFunction } from "express";
import { supabase } from "../services/supabase.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// Middleware to enforce active Supabase user sessions
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // If Supabase is not configured, pass through (runs in local single-user bypass mode)
  if (!supabase) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: error?.message || "Invalid authentication session" });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Authentication failed" });
  }
}
