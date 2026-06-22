import express from "express";
import cors from "cors";
import { postsRouter } from "./routes/posts.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

// Mount API routes
app.use("/api", postsRouter);
app.use("/api", authRouter);

app.listen(port, () => {
  console.log(`[API Server] Running on http://localhost:${port}`);
});
