'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

import { auth } from '@/lib/firebase';
import {
  getAuthErrorMessage,
  getCustomerProfile,
  normaliseEmail,
  prepareCustomerAuth,
  saveCustomerProfile,
} from '@/lib/customerAuth';
import { logUserSession } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = window.localStorage.getItem('jayluxe-remembered-email');
    if (savedEmail) setEmail(savedEmail);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/account');
        return;
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalizedEmail = normaliseEmail(email);
    if (!normalizedEmail || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setLoading(true);

    try {
      await prepareCustomerAuth();
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      if (rememberMe) {
        window.localStorage.setItem('jayluxe-remembered-email', normalizedEmail);
      } else {
        window.localStorage.removeItem('jayluxe-remembered-email');
      }

      try {
        const profile = await getCustomerProfile(credential.user);
        await saveCustomerProfile(credential.user, {
          name: profile.name,
          phone: profile.phone,
          joined: profile.joined,
        });
        await logUserSession(credential.user.uid, credential.user.email);
      } catch (profileError) {
        console.error('Customer profile update failed:', profileError);
      }

      localStorage.removeItem('jj-user');
      localStorage.removeItem('jj-users');
      router.replace('/account');
      router.refresh();
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="jl-auth-page">
      <section className="jl-auth-aside" aria-labelledby="login-welcome-title">
        <div>
          <span className="jl-auth-badge">
            JayLuxe Client Access
          </span>
          <h1 id="login-welcome-title" className="font-serif">
            Welcome back to your world of luxury.
          </h1>
          <p>
            Manage orders, saved pieces, delivery updates and personalised
            recommendations from one elegant dashboard.
          </p>
        </div>
      </section>

      <section className="jl-auth-panel">
        <div className="jl-auth-card">
          <p className="jl-auth-eyebrow">Customer Login</p>
          <h2 className="font-serif">Welcome Back</h2>
          <p className="jl-auth-intro">
            Sign in securely with the email address connected to your account.
          </p>

          {!authReady ? (
            <p className="jl-auth-status" role="status">Checking your session…</p>
          ) : (
            <form onSubmit={handleLogin} className="jl-auth-form" noValidate>
              <label htmlFor="login-email">
                <span>Email Address</span>
                <div>
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError('');
                    }}
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="Enter your email address"
                    aria-describedby={error ? 'login-error' : undefined}
                    disabled={loading}
                  />
                </div>
              </label>

              <label htmlFor="login-password">
                <span>Password</span>
                <div>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-describedby={error ? 'login-error' : undefined}
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
              </label>

              <div className="jl-remember-row">
                <label className="jl-remember-control">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>

                <div className="jl-auth-form-meta">
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>
              </div>

              {error ? (
                <p id="login-error" className="jl-auth-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          <p className="jl-auth-switch">
            Do not have an account? <Link href="/register">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
