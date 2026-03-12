import { Router } from "express";
import { verifyIdToken, getFirestore } from "../firebase-admin.js";

const router = Router();
const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const NOTION_SEARCH_URL = "https://api.notion.com/v1/search";
const NOTION_VERSION = "2022-06-28";

function getAuthHeader() {
  const id = process.env.NOTION_CLIENT_ID;
  const secret = process.env.NOTION_CLIENT_SECRET;
  if (!id || !secret) throw new Error("NOTION_CLIENT_ID and NOTION_CLIENT_SECRET are required");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

// POST /api/notion/connect — body: { idToken }. Returns { redirectUrl }.
router.post("/connect", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken required" });

    const uid = await verifyIdToken(idToken);
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI;
    if (!clientId || !redirectUri) return res.status(500).json({ error: "Notion OAuth not configured" });

    const state = encodeURIComponent(uid);
    const redirectUrl = `${NOTION_AUTH_URL}?owner=user&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    return res.json({ redirectUrl });
  } catch (e) {
    console.error("Notion connect error:", e);
    return res.status(401).json({ error: e.message || "Invalid token" });
  }
});

// GET /api/notion/callback — Notion redirects here with ?code=...&state=uid
router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (error) {
    return res.redirect(`${frontendUrl}/notes?notion=denied`);
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/notes?notion=error`);
  }

  try {
    const uid = decodeURIComponent(state);
    const body = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    };
    const response = await fetch(NOTION_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Notion token exchange failed:", response.status, err);
      return res.redirect(`${frontendUrl}/notes?notion=error`);
    }

    const data = await response.json();
    const db = getFirestore();
    await db.collection("notion_tokens").doc(uid).set({
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      bot_id: data.bot_id || null,
      workspace_name: data.workspace_name || null,
      updatedAt: new Date(),
    });

    return res.redirect(`${frontendUrl}/notes?notion=connected`);
  } catch (e) {
    console.error("Notion callback error:", e);
    return res.redirect(`${frontendUrl}/notes?notion=error`);
  }
});

// GET /api/notion/status — Authorization: Bearer <idToken>. Returns { connected: boolean }.
router.get("/status", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authorization required" });

    const uid = await verifyIdToken(token);
    const db = getFirestore();
    const doc = await db.collection("notion_tokens").doc(uid).get();
    return res.json({ connected: doc.exists && !!doc.data()?.access_token });
  } catch (e) {
    console.error("Notion status error:", e);
    return res.status(401).json({ error: e.message || "Invalid token" });
  }
});

// GET /api/notion/notes — Authorization: Bearer <idToken>. Returns list of Notion pages.
router.get("/notes", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authorization required" });

    const uid = await verifyIdToken(token);
    const db = getFirestore();
    const doc = await db.collection("notion_tokens").doc(uid).get();
    const accessToken = doc.exists ? doc.data()?.access_token : null;
    if (!accessToken) return res.status(401).json({ error: "Notion not connected", connected: false });

    const response = await fetch(NOTION_SEARCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        query: "",
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: 50,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Notion search failed:", response.status, err);
      if (response.status === 401) {
        await db.collection("notion_tokens").doc(uid).delete();
        return res.status(401).json({ error: "Notion token expired", connected: false });
      }
      return res.status(response.status).json({ error: "Notion API error" });
    }

    const data = await response.json();

    function getPageTitle(item) {
      const p = item.properties;
      if (!p) return "Untitled";
      const titleProp = p.title || p.Name || p.name;
      if (!titleProp) return "Untitled";
      const arr = titleProp.title || titleProp.rich_text;
      if (Array.isArray(arr) && arr[0]) return arr[0].plain_text || "Untitled";
      return "Untitled";
    }

    const results = (data.results || []).map((item) => ({
      id: item.id,
      url: item.url,
      title: getPageTitle(item),
      last_edited: item.last_edited_time,
      object: item.object,
    }));

    return res.json({ pages: results });
  } catch (e) {
    console.error("Notion notes error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

export default router;
