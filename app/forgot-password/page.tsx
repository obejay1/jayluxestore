'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSent(false);
    setLoading(true);

    try {
      const response = await fetch('/api/email/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'The reset request could not be completed.');
      }
      setSent(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'The reset request could not be completed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="jl-auth-page">
      <section className="jl-auth-aside" aria-labelledby="reset-welcome-title">
        <div>
          <span className="jl-auth-badge">
            Account Recovery
          </span>
          <h1 id="reset-welcome-title" className="font-serif">
            Return to your JayLuxe account securely.
          </h1>
          <p>
            We will send a secure Firebase password-reset link to your account
            email address through JayLuxe email delivery.
          </p>
        </div>
      </section>

      <section className="jl-auth-panel">
        <div className="jl-auth-card">
          <Link href="/login" className="jl-auth-back">
            <ArrowLeft size={16} aria-hidden="true" /> Back to login
          </Link>
          <p className="jl-auth-eyebrow">Password Help</p>
          <h2 className="font-serif">Reset Password</h2>
          <p className="jl-auth-intro">
            Enter the email address registered to your JayLuxe account.
          </p>

          <form onSubmit={submit} className="jl-auth-form" noValidate>
            <label htmlFor="reset-email">
              <span>Email Address</span>
              <div>
                <Mail size={18} aria-hidden="true" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Enter your email address"
                  aria-describedby={error ? 'reset-error' : sent ? 'reset-success' : undefined}
                />
              </div>
            </label>

            {error ? (
              <p id="reset-error" className="jl-auth-error" role="alert">
                {error}
              </p>
            ) : null}

            {sent ? (
              <p id="reset-success" className="jl-auth-success" role="status">
                Check your inbox and spam folder for the password-reset link.
              </p>
            ) : null}

            <button type="submit" disabled={loading}>
              {loading ? 'Sending link…' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
