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

function firebaseAdminOptions(): AppOptions {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
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
