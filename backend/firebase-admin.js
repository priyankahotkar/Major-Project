import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let app = null;

export function getFirebaseAdmin() {
  if (app) return app;

  // Prefer credentials provided directly via env (.env), fallback to JSON path.
  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envPrivateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (envProjectId && envClientEmail && envPrivateKeyRaw) {
    const privateKey = envPrivateKeyRaw.replace(/\\n/g, "\n");
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envProjectId,
        clientEmail: envClientEmail,
        privateKey,
      }),
    });
    return app;
  }

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      "Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or set FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS"
    );
  }

  const fullPath =
    path.startsWith("/") || path.match(/^[A-Za-z]:/)
      ? path
      : join(process.cwd(), path);
  const serviceAccount = JSON.parse(readFileSync(fullPath, "utf8"));

  app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return app;
}

export async function verifyIdToken(idToken) {
  const auth = getFirebaseAdmin().auth();
  const decoded = await auth.verifyIdToken(idToken);
  return decoded.uid;
}

export function getFirestore() {
  return getFirebaseAdmin().firestore();
}
