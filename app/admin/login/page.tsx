'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { auth } from '@/lib/firebase';
import styles from './page.module.css';

type AdminSessionResponse = {
  ok?: boolean;
  message?: string;
};

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as AdminSessionResponse;

  try {
    return JSON.parse(text) as AdminSessionResponse;
  } catch {
    throw new Error('The admin service returned an invalid response.');
  }
}

function firebaseLoginMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found'
    ) {
      return 'The email address or password is incorrect.';
    }

    if (error.code === 'auth/user-disabled') {
      return 'Your account has been disabled. Please contact the administrator.';
    }

    if (error.code === 'auth/too-many-requests') {
      return 'Too many sign-in attempts. Please wait before trying again.';
    }

    if (error.code === 'auth/network-request-failed') {
      return 'Network error. Check your connection and try again.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'Admin login failed. Please try again.';
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const queryMessage = useMemo(() => {
    const error = searchParams.get('error');
    if (error === 'disabled') {
      return 'Your account has been disabled. Please contact the administrator.';
    }
    if (error === 'expired') {
      return 'Your administrator session expired. Please sign in again.';
    }
    return '';
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || submitting) return;

    setMessage('');
    setSubmitting(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        await signOut(auth).catch(() => undefined);
        setMessage(data.message || 'Admin login failed. Please try again.');
        return;
      }

      const requestedPath = searchParams.get('next');
      const destination =
        requestedPath?.startsWith('/admin') &&
        !requestedPath.startsWith('/admin/login')
          ? requestedPath
          : '/admin';

      router.replace(destination);
      router.refresh();
    } catch (error) {
      console.error('Admin login failed:', error);
      await signOut(auth).catch(() => undefined);
      setMessage(firebaseLoginMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const visibleMessage = message || queryMessage;

  return (
    <main className={styles.page}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />

      <section className={styles.card} aria-labelledby="admin-login-title">
        <aside className={styles.brandPanel}>
          <div className={styles.logoWrap}>
            <Image
              src="/logo.png"
              alt="JayLuxe"
              width={104}
              height={104}
              priority
              className={styles.logo}
            />
          </div>

          <span className={styles.brandEyebrow}>
            Private administration
          </span>
          <h1>JayLuxe</h1>
          <p>Luxury Beauty, Fashion &amp; Lifestyle Store</p>

          <div className={styles.trustNote}>
            <ShieldCheck size={19} aria-hidden="true" />
            <span>Protected access for authorised administrators and staff only.</span>
          </div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.heading}>
            <span>Secure staff sign in</span>
            <h2 id="admin-login-title">Admin Dashboard</h2>
            <p>Use the unique email address and password assigned to your account.</p>
          </div>

          <form onSubmit={submit} className={styles.form} noValidate>
            <label htmlFor="admin-email">Email Address</label>
            <div className={styles.pinField}>
              <Mail size={19} aria-hidden="true" />
              <input
                id="admin-email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage('');
                }}
                type="email"
                autoComplete="username"
                placeholder="name@jayluxe.com"
                required
                maxLength={200}
                disabled={submitting}
                aria-invalid={Boolean(visibleMessage)}
              />
            </div>

            <label htmlFor="admin-password">Password</label>
            <div className={styles.pinField}>
              <LockKeyhole size={19} aria-hidden="true" />
              <input
                id="admin-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setMessage('');
                }}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                minLength={6}
                maxLength={128}
                disabled={submitting}
                aria-invalid={Boolean(visibleMessage)}
                aria-describedby={visibleMessage ? 'admin-login-error' : undefined}
              />
              <button
                type="button"
                className={styles.visibilityButton}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={submitting}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>

            {visibleMessage ? (
              <p
                id="admin-login-error"
                className={styles.error}
                role="alert"
                aria-live="polite"
              >
                {visibleMessage}
              </p>
            ) : null}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={submitting || !email.trim() || !password}
            >
              {submitting ? 'Signing in…' : 'Login to Dashboard'}
            </button>
          </form>

          <p className={styles.securityNote}>
            Firebase Authentication ·{' '}
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
