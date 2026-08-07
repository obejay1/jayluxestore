'use client';

import {
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joined?: string;
};

let persistencePromise: Promise<void> | null = null;

export function prepareCustomerAuth() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence);
  }

  return persistencePromise;
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getCustomerProfile(user: User): Promise<CustomerProfile> {
  const profileReference = doc(db, 'users', user.uid);
  const snapshot = await getDoc(profileReference);
  const data = snapshot.data() as Partial<CustomerProfile> | undefined;

  return {
    id: user.uid,
    name: data?.name?.trim() || user.displayName?.trim() || 'Valued Customer',
    email: user.email || data?.email || '',
    phone: data?.phone || '',
    joined: data?.joined,
  };
}

export async function saveCustomerProfile(
  user: User,
  profile: Pick<CustomerProfile, 'name' | 'phone'> & { joined?: string },
) {
  const email = normaliseEmail(user.email || '');

  await setDoc(
    doc(db, 'users', user.uid),
    {
      id: user.uid,
      uid: user.uid,
      name: profile.name.trim(),
      email,
      emailLower: email,
      phone: profile.phone.trim(),
      joined: profile.joined || new Date().toISOString(),
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return 'Something went wrong. Please try again.';
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account already exists for this email address.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/weak-password':
      return 'Use a stronger password with at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact JayLuxe support.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}
