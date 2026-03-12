import "dotenv/config";
import express from "express";
import cors from "cors";
import notionRoutes from "./routes/notion.js";

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/notion", notionRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`MentorConnect backend running on http://localhost:${PORT}`);
});
