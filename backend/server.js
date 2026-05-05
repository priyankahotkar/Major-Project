import "dotenv/config";
import express from "express";
import cors from "cors";
import notionRoutes from "./routes/notion.js";

const app = express();

// Use Render's PORT
const PORT = process.env.PORT || 5000;

// Allow both local + deployed frontend
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://major-project-peach.vercel.app",
  "https://major-project-peach.vercel.app/notes",
  process.env.FRONTEND_URL
];

// CORS setup
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

// Middleware
app.use(express.json());

// Routes
app.use("/api/notion", notionRoutes);

// Health check route (for Render)
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});