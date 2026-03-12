# MentorConnect Backend

Backend for MentorConnect: Notion OAuth and API proxy. All server-side code lives in this folder.

## What it does

- **Notion OAuth**: Connect a user’s Notion workspace via OAuth 2.0.
- **Token storage**: Stores Notion access (and refresh) tokens in Firestore (`notion_tokens/{uid}`), keyed by Firebase UID. Only the backend reads/writes this collection.
- **Notion pages**: Authenticated endpoint to list pages/databases the user shared with the integration.

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `NOTION_CLIENT_ID` | From [Notion integrations](https://www.notion.so/my-integrations) — create a **Public** integration and copy the OAuth client ID. |
| `NOTION_CLIENT_SECRET` | OAuth client secret from the same integration. |
| `NOTION_REDIRECT_URI` | Must match a redirect URI added in the Notion integration (e.g. `http://localhost:5000/api/notion/callback` for local dev). |
| `FRONTEND_URL` | Your React app origin (e.g. `http://localhost:5173`). Used for redirects after OAuth. |
| `PORT` | Backend port (default `5000`). |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to your Firebase service account JSON file (e.g. `./serviceAccountKey.json`). Used to verify Firebase ID tokens and write to Firestore. |

To get a service account key: Firebase Console → Project settings → Service accounts → Generate new private key. Save the JSON in `backend/` (or elsewhere) and set `FIREBASE_SERVICE_ACCOUNT_PATH` to that path.

### 3. Notion integration (Public)

1. Go to [Notion integrations](https://www.notion.so/my-integrations).
2. New integration → **Public**.
3. Set **Redirect URIs** to your backend callback URL (e.g. `http://localhost:5000/api/notion/callback`; for production use your real backend URL).
4. Copy **OAuth client ID** and **OAuth client secret** into `.env`.

### 4. Run the backend

```bash
npm run dev
```

Runs on `http://localhost:5000` (or your `PORT`). Frontend must call this URL; set `VITE_BACKEND_URL=http://localhost:5000` in the frontend `.env` if different.

## API (all under `/api/notion`)

- **POST /connect**  
  Body: `{ "idToken": "<Firebase ID token>" }`.  
  Returns `{ "redirectUrl": "https://api.notion.com/v1/oauth/authorize?..." }`. Frontend redirects the user there to start OAuth.

- **GET /callback**  
  Notion redirects here with `?code=...&state=<uid>`. Exchanges `code` for tokens, stores them in Firestore, redirects to `FRONTEND_URL/notes?notion=connected`.

- **GET /status**  
  Header: `Authorization: Bearer <Firebase ID token>`.  
  Returns `{ "connected": true|false }`.

- **GET /notes**  
  Header: `Authorization: Bearer <Firebase ID token>`.  
  Returns `{ "pages": [ { "id", "url", "title", "last_edited", "object" }, ... ] }` for pages/databases shared with the integration.

## Firestore

- The backend writes Notion tokens to the `notion_tokens` collection, one document per user (document ID = Firebase UID). Keep this collection restricted in Firestore rules so only the backend (admin SDK) can read/write; the frontend should never access it.
