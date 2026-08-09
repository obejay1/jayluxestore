import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type AppOptions,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase App Hosting and Cloud Run provide Google Application Default
 * Credentials to the running service. Prefer those credentials on Google
 * managed runtimes so a stale local service-account key cannot break the
 * production Admin SDK authentication flow.
 */
function isGoogleManagedRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_CONFIG,
  );
}

function firebaseAdminOptions(): AppOptions {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  // Firebase App Hosting / Cloud Run: use the runtime service identity.
  if (isGoogleManagedRuntime()) {
    return {
      ...(projectId ? { projectId } : {}),
      credential: applicationDefault(),
    };
  }

  // Local development or non-Google hosts (for example Vercel): use the
  // explicitly configured service-account credential when all parts exist.
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    .trim();

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      credential: cert({ projectId, clientEmail, privateKey }),
    };
  }

  // ADC also supports local GOOGLE_APPLICATION_CREDENTIALS and other
  // environments that intentionally provide default Google credentials.
  return {
    ...(projectId ? { projectId } : {}),
    credential: applicationDefault(),
  };
}

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseAdminOptions());

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
