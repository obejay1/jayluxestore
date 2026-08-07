import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import process from 'node:process';

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

async function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      await access(file, constants.R_OK);
      const text = await readFile(file, 'utf8');
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const equals = line.indexOf('=');
        if (equals < 1) continue;
        const key = line.slice(0, equals).trim();
        let value = line.slice(equals + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      }
      return;
    } catch {
      // Try the next local environment file.
    }
  }
}

await loadLocalEnv();

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
  initializeApp(
    projectId && clientEmail && privateKey
      ? {
          projectId,
          credential: cert({ projectId, clientEmail, privateKey }),
        }
      : {
          ...(projectId ? { projectId } : {}),
          credential: applicationDefault(),
        },
  );
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
  const fullName = (await rl.question('Super Admin full name: ')).trim();
  const email = (await rl.question('Super Admin email: ')).trim().toLowerCase();
  const password = await rl.question('Temporary password (8+ characters): ');
  const phoneNumber = (await rl.question('Phone in E.164 format (optional): ')).trim();

  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid full name and email address are required.');
  }
  if (password.length < 8) {
    throw new Error('The temporary password must contain at least 8 characters.');
  }
  if (phoneNumber && !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new Error('The phone number must use E.164 format, for example +2348012345678.');
  }

  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, {
      displayName: fullName,
      password,
      phoneNumber: phoneNumber || null,
      disabled: false,
    });
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({
      displayName: fullName,
      email,
      password,
      phoneNumber: phoneNumber || undefined,
      disabled: false,
    });
  }

  const permissions = [
    'dashboard',
    'products',
    'categories',
    'orders',
    'bookings',
    'reports',
    'promotions',
    'testimonials',
    'customers',
    'content',
    'settings',
    'activity',
    'users',
  ];

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    admin: true,
    role: 'super_admin',
    permissions,
  });

  const profileRef = getFirestore().collection('adminUsers').doc(user.uid);
  const existingProfile = await profileRef.get();
  await profileRef.set(
    {
      uid: user.uid,
      fullName,
      email,
      emailLower: email,
      phoneNumber: phoneNumber || null,
      role: 'super_admin',
      status: 'active',
      permissions,
      online: false,
      ...(existingProfile.exists
        ? {}
        : {
            loginCount: 0,
            lastLoginAt: null,
            lastLogoutAt: null,
            lastSeenAt: null,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: 'bootstrap-script',
          }),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'bootstrap-script',
    },
    { merge: true },
  );

  console.log(`\nSuper Admin ready: ${email}`);
  console.log('Sign in at /admin/login, then change the temporary password using Firebase password reset.');
} finally {
  rl.close();
}
