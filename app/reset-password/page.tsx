'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
} from 'lucide-react';

import { auth } from '@/lib/firebase';

type ResetState = 'checking' | 'ready' | 'invalid' | 'success';

function safeResetError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (
    code === 'auth/expired-action-code' ||
    code === 'auth/invalid-action-code' ||
    code === 'auth/user-disabled' ||
    code === 'auth/user-not-found'
  ) {
    return 'This password reset link is invalid or has expired. Please request a new one.';
  }

  if (code === 'auth/weak-password') {
    return 'Choose a stronger password with at least 6 characters.';
  }

  if (code === 'auth/network-request-failed') {
    return 'We could not connect to JayLuxe. Check your connection and try again.';
  }

  return 'We could not reset your password. Please request a new reset link and try again.';
}

export default function ResetPasswordPage() {
  const [resetState, setResetState] = useState<ResetState>('checking');
  const [oobCode, setOobCode] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('oobCode')?.trim() || '';

    if (!code) {
      setError('This password reset link is incomplete. Please request a new reset link.');
      setResetState('invalid');
      return;
    }

    let active = true;

    void verifyPasswordResetCode(auth, code)
      .then((email) => {
        if (!active) return;
        setOobCode(code);
        setAccountEmail(email);
        setResetState('ready');
        window.history.replaceState(null, '', '/reset-password');
      })
      .catch((verifyError) => {
        if (!active) return;
        setError(safeResetError(verifyError));
        setResetState('invalid');
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || resetState !== 'ready') return;

    setError('');

    if (password.length < 6) {
      setError('Your new password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setOobCode('');
      setResetState('success');
    } catch (resetError) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setError(safeResetError(resetError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="jl-auth-page">
      <section className="jl-auth-aside" aria-labelledby="new-password-welcome-title">
        <div>
          <span className="jl-auth-badge">Account Security</span>
          <h1 id="new-password-welcome-title" className="font-serif">
            Choose a new JayLuxe password securely.
          </h1>
          <p>
            Your reset request is protected by Firebase Authentication. JayLuxe
            never stores or sends your password by email.
          </p>
        </div>
      </section>

      <section className="jl-auth-panel">
        <div className="jl-auth-card">
          <p className="jl-auth-eyebrow">Password Reset</p>
          <h2 className="font-serif">Choose New Password</h2>

          {resetState === 'checking' ? (
            <p className="jl-auth-status" role="status">
              Verifying your secure reset link…
            </p>
          ) : null}

          {resetState === 'invalid' ? (
            <div>
              <p className="jl-auth-error" role="alert">
                {error}
              </p>
              <div className="jl-auth-form-meta">
                <Link href="/forgot-password">Request a new reset link</Link>
              </div>
            </div>
          ) : null}

          {resetState === 'success' ? (
            <div>
              <p className="jl-auth-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" /> Your password has been updated successfully.
              </p>
              <p className="jl-auth-intro">
                You can now sign in to your JayLuxe account with your new password.
              </p>
              <p className="jl-auth-switch">
                <Link href="/login">Sign In to JayLuxe</Link>
              </p>
            </div>
          ) : null}

          {resetState === 'ready' ? (
            <>
              <p className="jl-auth-intro">
                {accountEmail
                  ? `Create a new password for ${accountEmail}.`
                  : 'Create a new password for your JayLuxe account.'}
              </p>

              <form onSubmit={submit} className="jl-auth-form" noValidate>
                <label htmlFor="new-password">
                  <span>New Password</span>
                  <div>
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError('');
                      }}
                      minLength={6}
                      required
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      aria-describedby={error ? 'new-password-error' : 'new-password-help'}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="jl-password-toggle"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                  <small id="new-password-help">Use at least 6 characters.</small>
                </label>

                <label htmlFor="confirm-new-password">
                  <span>Confirm New Password</span>
                  <div>
                    <KeyRound size={18} aria-hidden="true" />
                    <input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError('');
                      }}
                      minLength={6}
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      aria-describedby={error ? 'new-password-error' : undefined}
                      disabled={loading}
                    />
                  </div>
                </label>

                {error ? (
                  <p id="new-password-error" className="jl-auth-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <button type="submit" disabled={loading}>
                  {loading ? 'Updating password…' : 'Update Password'}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
