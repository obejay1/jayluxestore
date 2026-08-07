'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock3,
  MapPin,
  ReceiptText,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { getBridalPackages, type BridalPackage } from '@/lib/bridal';
import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import ResponsiveImage from '@/components/ResponsiveImage';

const money = (amount?: number) =>
  `₦${Math.round(Number(amount || 0)).toLocaleString('en-NG')}`;

function formatBridalDate(value: string) {
  if (!value) return 'Choose a date in the form';

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function BridalBookingContent() {
  const searchParams = useSearchParams();
  const packageFromUrl = searchParams.get('package') || '';

  const [packages, setPackages] = useState<BridalPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState(packageFromUrl);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPackages() {
      try {
        const data = await getBridalPackages();
        if (cancelled) return;

        setPackages(data);

        if (!packageFromUrl && data.length > 0) {
          setSelectedPackage(data[0].title || data[0].name || 'Bridal Package');
        }
      } catch (error) {
        console.error('Failed to load bridal packages:', error);
      }
    }

    void loadPackages();

    return () => {
      cancelled = true;
    };
  }, [packageFromUrl]);

  const currentPackage = packages.find((pkg) => {
    const name = pkg.title || pkg.name || 'Bridal Package';
    return name === selectedPackage;
  });

  const packageName =
    currentPackage?.title || currentPackage?.name || selectedPackage || 'Bridal Package';
  const packageDuration =
    currentPackage?.duration?.trim() || 'Confirmed after consultation';
  const includedServices = currentPackage?.features || [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter your name.');
      return;
    }

    if (!customerPhone.trim()) {
      alert('Please enter your phone number.');
      return;
    }

    if (!selectedPackage.trim()) {
      alert('Please select a bridal package.');
      return;
    }

    if (!eventDate.trim()) {
      alert('Please choose your event date.');
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'bridal',
          serviceId: currentPackage?.id || selectedPackage,
          serviceName: selectedPackage,
          servicePrice: Number(currentPackage?.price || 0),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          date: eventDate,
          time: '',
          eventLocation: eventLocation.trim(),
          notes: message.trim(),
          website: '',
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.message || 'The bridal booking could not be submitted.');
      }

      setSuccess(true);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setEventDate('');
      setEventLocation('');
      setMessage('');
    } catch (error) {
      console.error('Failed to save bridal booking:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="jl-bridal-booking-page">
      <section className="jl-bridal-booking-hero">
        <PageHeroIcon icon={CalendarDays} label="Bridal booking" />

        <span>
          <Sparkles size={16} aria-hidden="true" />
          JayLuxe Bridal Booking
        </span>

        <h1>Book Your Bridal Package</h1>

        <p>
          Share your wedding details and JayLuxe will contact you to confirm your
          bridal beauty appointment.
        </p>
      </section>

      <section className="jl-bridal-booking-shell">
        <Link href="/bridal" className="jl-bridal-booking-back">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to Bridal Packages
        </Link>

        <div className="jl-bridal-booking-wrap">
          <aside className="jl-bridal-booking-info" aria-label="Selected bridal package">
            <article className="jl-bridal-booking-card jl-bridal-summary-card">
              <div className="jl-bridal-summary-media">
                <ResponsiveImage
                  src={currentPackage?.image}
                  alt={`${packageName} bridal package`}
                  fill
                  sizes="(max-width: 900px) 100vw, 38vw"
                />
                <span>Selected Package</span>
              </div>

              <div className="jl-bridal-summary-body">
                <div className="jl-bridal-summary-heading">
                  <div>
                    <small>JayLuxe Bridal</small>
                    <h2>{packageName}</h2>
                  </div>
                  <strong>{money(currentPackage?.price)}</strong>
                </div>

                <p>
                  {currentPackage?.description ||
                    'A premium bridal beauty package tailored to your wedding-day look.'}
                </p>

                <div className="jl-bridal-summary-meta">
                  <div>
                    <Clock3 size={18} aria-hidden="true" />
                    <span>
                      <small>Duration</small>
                      <strong>{packageDuration}</strong>
                    </span>
                  </div>

                  <div>
                    <CalendarDays size={18} aria-hidden="true" />
                    <span>
                      <small>Bridal date</small>
                      <strong>{formatBridalDate(eventDate)}</strong>
                    </span>
                  </div>
                </div>

                <div className="jl-bridal-summary-services">
                  <h3>Included Services</h3>

                  {includedServices.length > 0 ? (
                    <ul>
                      {includedServices.slice(0, 6).map((feature) => (
                        <li key={feature}>
                          <CheckCircle size={16} aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Package details will be confirmed during your consultation.</p>
                  )}
                </div>

                <div className="jl-bridal-summary-booking">
                  <h3>
                    <ReceiptText size={18} aria-hidden="true" />
                    Booking Summary
                  </h3>

                  <dl>
                    <div>
                      <dt><UserRound size={15} aria-hidden="true" /> Bride</dt>
                      <dd>{customerName.trim() || 'Add your name in the form'}</dd>
                    </div>
                    <div>
                      <dt><CalendarDays size={15} aria-hidden="true" /> Date</dt>
                      <dd>{formatBridalDate(eventDate)}</dd>
                    </div>
                    <div>
                      <dt><MapPin size={15} aria-hidden="true" /> Location</dt>
                      <dd>{eventLocation.trim() || 'Add your event location'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="jl-bridal-booking-note">
                  <CalendarDays size={18} aria-hidden="true" />
                  Book early to reserve your wedding date.
                </div>
              </div>
            </article>
          </aside>

          <form onSubmit={handleSubmit} className="jl-bridal-booking-form">
            {success ? (
              <div className="jl-bridal-booking-success full" role="status">
                <CheckCircle size={22} aria-hidden="true" />
                Your bridal booking request has been sent successfully. We will contact
                you soon.
              </div>
            ) : null}

            <div className="full jl-bridal-form-heading">
              <span>Booking Details</span>
              <h2>Reserve Your Bridal Date</h2>
              <p>Complete the form and our bridal team will confirm availability.</p>
            </div>

            <div className="full">
              <label htmlFor="bridal-package">Bridal Package</label>
              <select
                id="bridal-package"
                value={selectedPackage}
                onChange={(event) => setSelectedPackage(event.target.value)}
                required
              >
                {packages.length === 0 ? (
                  <option value={selectedPackage || 'Bridal Package'}>
                    {selectedPackage || 'Bridal Package'}
                  </option>
                ) : null}

                {packages.map((pkg) => {
                  const name = pkg.title || pkg.name || 'Bridal Package';

                  return (
                    <option key={pkg.id} value={name}>
                      {name} — {money(pkg.price)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="bridal-name">Your Full Name</label>
              <input
                id="bridal-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="bridal-phone">Phone Number</label>
              <input
                id="bridal-phone"
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Enter your phone number"
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <div>
              <label htmlFor="bridal-email">Email Address Optional</label>
              <input
                id="bridal-email"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label htmlFor="bridal-date">Wedding / Event Date</label>
              <input
                id="bridal-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                required
              />
            </div>

            <div className="full">
              <label htmlFor="bridal-location">Event Location</label>
              <input
                id="bridal-location"
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                placeholder="City, venue, or address"
                autoComplete="street-address"
              />
            </div>

            <div className="full">
              <label htmlFor="bridal-message">Message Optional</label>
              <textarea
                id="bridal-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us anything important about your bridal look..."
                rows={5}
              />
            </div>

            <button type="submit" disabled={saving}>
              {saving ? 'Sending Booking...' : 'Submit Bridal Booking'}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function BridalBookingPage() {
  return (
    <Suspense fallback={<p style={{ padding: 40 }}>Loading booking page...</p>}>
      <BridalBookingContent />
    </Suspense>
  );
}
