'use client';

import { FormEvent, useRef, useState } from 'react';
import {
  Clock,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_EMAIL_LINK,
  OFFICIAL_PHONE_LINK,
  OFFICIAL_WHATSAPP_DISPLAY,
  OFFICIAL_WHATSAPP_URL,
} from '@/lib/contact';

type ContactResponse = {
  ok?: boolean;
  saved?: boolean;
  message?: string;
};

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setStatus('submitting');
    setFeedback('');

    try {
      const formData = new FormData(form);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        subject: String(formData.get('subject') || '').trim(),
        message: String(formData.get('message') || '').trim(),
        website: String(formData.get('website') || '').trim(),
      };

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: ContactResponse = {};

      if (text) {
        try {
          data = JSON.parse(text) as ContactResponse;
        } catch {
          throw new Error('The contact service returned an invalid response.');
        }
      }

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || 'Your message could not be sent. Please try again.',
        );
      }

      setStatus('success');
      setFeedback(
        data.message || 'Thank you. Your message has been sent to the JayLuxe team.',
      );
      formRef.current?.reset();
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setStatus('error');
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Your message could not be sent. Please try again.',
      );
    }
  }

  return (
    <main className="jl-editorial-page jl-contact-page">
      <section className="jl-editorial-hero jl-contact-hero-new">
        <PageHeroIcon icon={MessageCircle} label="Contact JayLuxe" />
        <span className="jl-contact-eyebrow">Client Care</span>
        <h1 className="font-serif">We are here to help.</h1>
        <p>
          Contact JayLuxe about products, orders, delivery, bridal packages,
          services or any part of your shopping experience.
        </p>
      </section>

      <section className="jl-contact-layout" aria-label="JayLuxe contact information and form">
        <aside className="jl-contact-details" aria-labelledby="jl-contact-details-title">
          <div className="jl-contact-details-intro">
            <p className="jl-section-kicker">Contact Information</p>
            <h2 id="jl-contact-details-title" className="font-serif">
              Speak with the JayLuxe team.
            </h2>
            <p>
              Choose the channel that works best for you. For an existing order,
              include your order number so our team can assist you faster.
            </p>
          </div>

          <div className="jl-contact-info-grid">
            <a className="jl-contact-info-card" href={OFFICIAL_EMAIL_LINK}>
              <span className="jl-contact-info-icon" aria-hidden="true"><Mail size={20} /></span>
              <span><small>Email</small><strong>{OFFICIAL_EMAIL}</strong></span>
            </a>

            <a className="jl-contact-info-card" href={OFFICIAL_PHONE_LINK}>
              <span className="jl-contact-info-icon" aria-hidden="true"><Phone size={20} /></span>
              <span><small>Phone</small><strong>{OFFICIAL_WHATSAPP_DISPLAY}</strong></span>
            </a>

            <a
              className="jl-contact-info-card"
              href={OFFICIAL_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              <span className="jl-contact-info-icon" aria-hidden="true"><MessageCircle size={20} /></span>
              <span><small>WhatsApp</small><strong>{OFFICIAL_WHATSAPP_DISPLAY}</strong></span>
            </a>

            <div className="jl-contact-info-card">
              <span className="jl-contact-info-icon" aria-hidden="true"><MapPin size={20} /></span>
              <span><small>Service Area</small><strong>Nigeria</strong></span>
            </div>

            <div className="jl-contact-info-card">
              <span className="jl-contact-info-icon" aria-hidden="true"><Clock size={20} /></span>
              <span><small>Business Hours</small><strong>Monday–Saturday</strong></span>
            </div>

            <div className="jl-contact-info-card">
              <span className="jl-contact-info-icon" aria-hidden="true"><Headphones size={20} /></span>
              <span><small>Customer Support</small><strong>Orders, delivery &amp; services</strong></span>
            </div>
          </div>
        </aside>

        <form
          ref={formRef}
          className="jl-contact-form"
          onSubmit={submit}
          noValidate
          aria-describedby={feedback ? 'jl-contact-feedback' : undefined}
        >
          <div className="jl-contact-form-heading">
            <p className="jl-section-kicker">Send a Message</p>
            <h2 className="font-serif">How may we assist you?</h2>
            <p>Complete the form and our customer care team will review your enquiry.</p>
          </div>

          {feedback ? (
            <div
              id="jl-contact-feedback"
              className={status === 'success' ? 'jl-contact-success' : 'jl-contact-error'}
              role={status === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {feedback}
            </div>
          ) : null}

          <label className="jl-honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>

          <div className="jl-contact-form-grid">
            <label>
              <span>Full Name</span>
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder="Your full name"
                disabled={status === 'submitting'}
              />
            </label>

            <label>
              <span>Email Address</span>
              <input
                type="email"
                name="email"
                required
                maxLength={160}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                disabled={status === 'submitting'}
              />
            </label>

            <label>
              <span>Phone Number</span>
              <input
                type="tel"
                name="phone"
                maxLength={40}
                autoComplete="tel"
                inputMode="tel"
                placeholder="Your phone number"
                disabled={status === 'submitting'}
              />
            </label>

            <label>
              <span>Enquiry Type</span>
              <select name="subject" required disabled={status === 'submitting'}>
                <option value="Product enquiry">Product enquiry</option>
                <option value="Order support">Order support</option>
                <option value="Delivery">Delivery</option>
                <option value="Service booking">Service booking</option>
                <option value="Bridal package">Bridal package</option>
                <option value="Other enquiry">Other enquiry</option>
              </select>
            </label>

            <label className="full">
              <span>Message</span>
              <textarea
                name="message"
                rows={7}
                required
                minLength={10}
                maxLength={5000}
                placeholder="Tell us how we can help"
                disabled={status === 'submitting'}
              />
            </label>
          </div>

          <button type="submit" disabled={status === 'submitting'}>
            <Send size={17} aria-hidden="true" />
            {status === 'submitting' ? 'Sending message…' : 'Send Message'}
          </button>
        </form>
      </section>

      <Footer />
    </main>
  );
}
