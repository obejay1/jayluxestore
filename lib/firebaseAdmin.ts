import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

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

/**
 * Accept both a multiline PEM value and the JSON/.env style value containing
 * literal "\\n" sequences. Also strip one accidental pair of surrounding
 * quotes, which is a common deployment-dashboard copy/paste mistake.
 */
function normalizePrivateKey(rawValue?: string) {
  if (!rawValue) return undefined;

  let privateKey = rawValue.trim();
  const isDoubleQuoted = privateKey.startsWith('"') && privateKey.endsWith('"');
  const isSingleQuoted = privateKey.startsWith("'") && privateKey.endsWith("'");

  if (isDoubleQuoted || isSingleQuoted) {
    privateKey = privateKey.slice(1, -1).trim();
  }

  privateKey = privateKey
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();

  return privateKey || undefined;
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
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    if (
      !privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
      !privateKey.includes('-----END PRIVATE KEY-----')
    ) {
      throw new Error(
        'FIREBASE_ADMIN_PRIVATE_KEY is not a valid PEM private key. Re-add the Firebase service-account private_key value without the JSON field name or surrounding quotes.',
      );
    }

    try {
      return {
        projectId,
        credential: cert({ projectId, clientEmail, privateKey }),
      };
    } catch (error) {
      throw new Error(
        'Firebase Admin could not parse FIREBASE_ADMIN_PRIVATE_KEY. Re-add the exact service-account private_key value in the deployment environment and redeploy.',
        { cause: error },
      );
    }
  }

  // ADC also supports local GOOGLE_APPLICATION_CREDENTIALS and other
  // environments that intentionally provide default Google credentials.
  return {
    ...(projectId ? { projectId } : {}),
    credential: applicationDefault(),
  };
}

let cachedAdminApp: App | undefined;

function getAdminApp() {
  if (cachedAdminApp) return cachedAdminApp;

  cachedAdminApp =
    getApps().length > 0
      ? getApp()
      : initializeApp(firebaseAdminOptions());

  return cachedAdminApp;
}

/**
 * Keep the existing adminAuth/adminDb API while deferring Admin SDK
 * initialization until an API route or dynamic server request actually uses
 * it. This prevents Next.js build-time module loading from trying to parse
 * production credentials while collecting page data.
 */
function createLazyProxy<T extends object>(factory: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const target = factory();
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export const adminAuth: Auth = createLazyProxy(() => getAuth(getAdminApp()));
export const adminDb: Firestore = createLazyProxy(() => getFirestore(getAdminApp()));
