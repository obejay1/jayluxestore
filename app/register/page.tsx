'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { auth } from '@/lib/firebase';
import {
  getAuthErrorMessage,
  normaliseEmail,
  prepareCustomerAuth,
  saveCustomerProfile,
} from '@/lib/customerAuth';
import { logUserSession } from '@/lib/store';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/account');
        return;
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, [router]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await prepareCustomerAuth();
      const credential = await createUserWithEmailAndPassword(
        auth,
        normaliseEmail(email),
        password,
      );
      const joined = new Date().toISOString();

      await updateProfile(credential.user, { displayName: name.trim() });
      await saveCustomerProfile(credential.user, {
        name: name.trim(),
        phone: phone.trim(),
        joined,
      });
      await logUserSession(credential.user.uid, credential.user.email);

      localStorage.removeItem('jj-user');
      localStorage.removeItem('jj-users');
      router.replace('/account');
      router.refresh();
    } catch (registrationError) {
      setError(getAuthErrorMessage(registrationError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="jl-auth-page jl-register-page">
      <section className="jl-auth-aside" aria-labelledby="register-welcome-title">
        <div>
          <span className="jl-auth-badge">
            <Sparkles size={16} aria-hidden="true" /> Join JayLuxe
          </span>
          <h1 id="register-welcome-title" className="font-serif">
            Your personalised luxury experience starts here.
          </h1>
          <p>
            Create an account to save favourites, follow orders and enjoy a
            smoother, more refined checkout experience.
          </p>
        </div>
      </section>

      <section className="jl-auth-panel">
        <div className="jl-auth-card">
          <p className="jl-auth-eyebrow">New Customer</p>
          <h2 className="font-serif">Create Account</h2>
          <p className="jl-auth-intro">
            Your password is handled securely by Firebase Authentication.
          </p>

          {!authReady ? (
            <p className="jl-auth-status" role="status">Checking your session…</p>
          ) : (
            <form onSubmit={handleRegister} className="jl-auth-form" noValidate>
              <label htmlFor="register-name">
                <span>Full Name</span>
                <div>
                  <UserRound size={18} aria-hidden="true" />
                  <input
                    id="register-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Enter your full name"
                  />
                </div>
              </label>

              <label htmlFor="register-email">
                <span>Email Address</span>
                <div>
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="Enter your email address"
                  />
                </div>
              </label>

              <label htmlFor="register-phone">
                <span>Phone Number</span>
                <div>
                  <Phone size={18} aria-hidden="true" />
                  <input
                    id="register-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="Enter your phone number"
                  />
                </div>
              </label>

              <label htmlFor="register-password">
                <span>Password</span>
                <div>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="jl-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label htmlFor="register-password-confirm">
                <span>Confirm Password</span>
                <div>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id="register-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    aria-describedby={error ? 'register-error' : undefined}
                  />
                </div>
              </label>

              {error ? (
                <p id="register-error" className="jl-auth-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="jl-auth-switch">
            Already registered? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
