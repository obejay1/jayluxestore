'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Share2,
  LoaderCircle,
} from 'lucide-react';

type SubscribeState = 'idle' | 'submitting' | 'success' | 'error';

export default function Footer() {
  const emailId = useId();
  const statusId = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<SubscribeState>('idle');
  const [message, setMessage] = useState('');

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'submitting') return;

    setState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, website }),
      });

      const text = await response.text();
      let result: {
        ok?: boolean;
        saved?: boolean;
        emailSent?: boolean;
        message?: string;
      } = {};

      if (text) {
        try {
          result = JSON.parse(text) as typeof result;
        } catch {
          result = {
            ok: false,
            message: 'The newsletter service returned an invalid response.',
          };
        }
      }

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
            (response.status >= 500
              ? 'The newsletter email service is temporarily unavailable.'
              : 'Subscription failed.'),
        );
      }

      setState('success');
      setMessage(result.message || 'Thank you for joining the JayLuxe list.');
      setEmail('');
      setWebsite('');
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'We could not subscribe you right now. Please try again.',
      );
    }
  }

  return (
    <footer className="global-footer-pro jl-compact-footer">
      <div className="global-footer-shell">
        <section
          className="global-footer-newsletter"
          aria-labelledby="footer-newsletter-title"
        >
          <div>
            <span>
              The JayLuxe Edit
            </span>
            <h2 id="footer-newsletter-title">
              Luxury arrivals, beauty notes and private offers.
            </h2>
            <p>Join our newsletter for carefully curated JayLuxe updates.</p>
          </div>

          <form
            onSubmit={handleSubscribe}
            aria-describedby={message ? statusId : undefined}
          >
            <label className="sr-only" htmlFor={emailId}>
              Email address
            </label>
            <div className="global-footer-newsletter-control">
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                autoComplete="email"
                inputMode="email"
                required
                disabled={state === 'submitting'}
              />
              <button
                type="submit"
                aria-label="Subscribe to the JayLuxe newsletter"
                disabled={state === 'submitting'}
              >
                {state === 'submitting' ? (
                  <LoaderCircle className="jl-spin" size={19} aria-hidden="true" />
                ) : (
                  <ArrowRight size={19} aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="jl-honeypot" aria-hidden="true">
              <label htmlFor={`${emailId}-website`}>Website</label>
              <input
                id={`${emailId}-website`}
                name="website"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {message ? (
              <small
                id={statusId}
                className={state === 'error' ? 'error' : undefined}
                role={state === 'error' ? 'alert' : 'status'}
              >
                {message}
              </small>
            ) : null}
          </form>
        </section>

        <div className="global-footer-grid">
          <div className="global-footer-brand">
            <Link href="/" className="global-footer-wordmark">
              JayLuxe
            </Link>
            <p>
              A premium destination for carefully selected fashion, beauty,
              hair, bridal and lifestyle experiences.
            </p>
            <div className="global-footer-socials" aria-label="JayLuxe social links">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="JayLuxe on Instagram"
              >
                <Camera size={19} aria-hidden="true" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="JayLuxe on Facebook"
              >
                <Share2 size={19} aria-hidden="true" />
              </a>
            </div>
          </div>

          <nav className="global-footer-links" aria-label="Shop and offers links">
            <h3>Shop &amp; Offers</h3>
            <ul>
              <li><Link href="/shop">Shop</Link></li>
              <li><Link href="/categories">Categories</Link></li>
              <li><Link href="/new-arrivals">New Arrivals</Link></li>
              <li><Link href="/featured-products">Featured Products</Link></li>
              <li><Link href="/best-sellers">Best Sellers</Link></li>
              <li><Link href="/flash-sale">Flash Sale</Link></li>
              <li><Link href="/promotions">Promotions</Link></li>
            </ul>
          </nav>

          <nav className="global-footer-links" aria-label="Services and inspiration links">
            <h3>Services &amp; Inspiration</h3>
            <ul>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/beauty-services">Beauty Services</Link></li>
              <li><Link href="/bridal">Bridal Packages</Link></li>
              <li><Link href="/bridal/book">Book Bridal Consultation</Link></li>
              <li><Link href="/gallery">Before &amp; After</Link></li>
              <li><Link href="/testimonials">Testimonials</Link></li>
            </ul>
          </nav>

          <nav className="global-footer-links" aria-label="Account and support links">
            <h3>Account &amp; Support</h3>
            <ul>
              <li><Link href="/account">My Account</Link></li>
              <li><Link href="/wishlist">Wishlist</Link></li>
              <li><Link href="/cart">Cart</Link></li>
              <li><Link href="/login">Login</Link></li>
              <li><Link href="/register">Create Account</Link></li>
              <li><Link href="/faq">Frequently Asked Questions</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
            </ul>
          </nav>

          <nav className="global-footer-links" aria-label="Company and policy links">
            <h3>Company &amp; Policies</h3>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms &amp; Conditions</Link></li>
            </ul>
          </nav>
        </div>

        <div className="global-footer-bottom">
          <p>© {new Date().getFullYear()} JayLuxe. All rights reserved.</p>
          <p>Beauty · Fashion · Bridal · Lifestyle</p>
        </div>
      </div>
    </footer>
  );
}
