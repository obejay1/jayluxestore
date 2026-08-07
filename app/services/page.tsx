'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle,
  Clock,
  Heart,
  LoaderCircle,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import Loading from '@/components/Loading';
import ResponsiveImage from '@/components/ResponsiveImage';
import ServiceCard from '@/components/ServiceCard';
import { getProducts } from '@/lib/store';
import type { Product } from '@/lib/types';
import { SERVICE_GRID_CLASSES } from '@/lib/layoutClasses';

const money = (amount?: number) =>
  `₦${Math.round(Number(amount || 0)).toLocaleString('en-NG')}`;

const today = new Date().toISOString().split('T')[0];

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  date: '',
  time: '',
  notes: '',
  website: '',
};

export default function ServicesPage() {
  const [services, setServices] = useState<Product[]>([]);
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [formMessage, setFormMessage] = useState('');
  const [form, setForm] = useState(initialForm);

  async function loadServices() {
    setLoading(true);
    setLoadError('');

    try {
      const items = await getProducts();
      setServices(items.filter((item) => item.type === 'service' && item.active !== false));
    } catch (error) {
      console.error('Failed to load services:', error);
      setLoadError('We could not load the service collection. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();

    const category = new URLSearchParams(window.location.search).get('category')?.trim();
    if (category) setActiveCategory(category);
  }, []);

  const serviceCategories = useMemo(() => {
    const categories = new Map<string, string>();
    services.forEach((service) => {
      if (service.category) categories.set(service.category.toLowerCase(), service.category);
    });
    return ['All', ...Array.from(categories.values()).sort((a, b) => a.localeCompare(b))];
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedCategory = activeCategory.trim().toLowerCase();

    return services.filter((service) => {
      const category = String(service.category || '').toLowerCase();
      const matchesCategory = activeCategory === 'All' || category === selectedCategory;
      const searchable = [service.name, service.category, service.description, service.price]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [services, activeCategory, searchQuery]);

  const featuredServices = useMemo(
    () => services.filter((service) => service.featured).slice(0, 3).concat(
      services.filter((service) => !service.featured).slice(0, Math.max(0, 3 - services.filter((service) => service.featured).length)),
    ).slice(0, 3),
    [services],
  );

  function openBooking(service: Product) {
    setSelectedService(service);
    setFormStatus('idle');
    setFormMessage('');

    window.setTimeout(() => {
      document.getElementById('booking-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  function resetBooking() {
    setSelectedService(null);
    setFormStatus('idle');
    setFormMessage('');
    setForm(initialForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || formStatus === 'submitting') return;

    setFormStatus('submitting');
    setFormMessage('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'service',
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          date: form.date,
          time: form.time,
          notes: form.notes,
          website: form.website,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'We could not submit your booking.');
      }

      setFormStatus('success');
      setFormMessage(result.message || 'Your booking request has been sent.');
      setForm(initialForm);
    } catch (error) {
      setFormStatus('error');
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'We could not submit your booking. Please try again.',
      );
    }
  }

  if (loading) return <Loading fullScreen />;

  return (
    <main className="jl-services-page">
      <section className="jl-services-hero">
        <div className="jl-services-hero-content">
          <PageHeroIcon icon={Scissors} label="Beauty services" />
          <span className="jl-services-badge">
            <Sparkles size={16} aria-hidden="true" /> Professional Beauty Services
          </span>
          <h1>Book Premium Beauty &amp; Lifestyle Services</h1>
          <p>Choose from professional wig installation, makeup, gele styling, dreadlocks, pedicure and other luxury beauty services from JayLuxe.</p>
          <div className="jl-services-hero-actions">
            <a href="#services" className="jl-services-btn gold">Explore Services <ArrowRight size={18} aria-hidden="true" /></a>
            <a href="#booking-form" className="jl-services-btn outline">Book Appointment <CalendarDays size={18} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="jl-services-trust" aria-label="JayLuxe service benefits">
        <div><ShieldCheck aria-hidden="true" /><strong>Trusted Service</strong><span>Professional beauty care</span></div>
        <div><Clock aria-hidden="true" /><strong>Easy Booking</strong><span>Choose date and time</span></div>
        <div><Heart aria-hidden="true" /><strong>Luxury Finish</strong><span>Designed around your style</span></div>
        <div><Star aria-hidden="true" /><strong>Premium Experience</strong><span>Beauty service that stands out</span></div>
      </section>

      {loadError ? (
        <section className="jl-services-empty" role="alert">
          <AlertCircle size={46} aria-hidden="true" />
          <h2>Services are temporarily unavailable</h2>
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadServices()}>Try again</button>
        </section>
      ) : (
        <>
          {featuredServices.length > 0 && (
            <section className="jl-services-featured">
              <div className="jl-services-section-head">
                <span>Popular Services</span>
                <h2>Customer Favourites</h2>
                <p>Start with some of our most requested JayLuxe services.</p>
              </div>
              <div className={`jl-services-featured-grid ${SERVICE_GRID_CLASSES}`}>
                {featuredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onBook={openBooking}
                    featured
                  />
                ))}
              </div>
            </section>
          )}

          <section className="jl-services-list-section" id="services">
            <div className="jl-services-section-head">
              <span>All Services</span>
              <h2>Choose Your Appointment</h2>
              <p>Search, filter and book the service you need.</p>
            </div>

            <div className="jl-services-toolbar">
              <div className="jl-services-search" role="search">
                <Search size={20} aria-hidden="true" />
                <label className="sr-only" htmlFor="service-search">Search services</label>
                <input
                  id="service-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search service, category or price"
                  enterKeyHint="search"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear service search"><X size={16} aria-hidden="true" /></button>
                )}
              </div>

              <div className="jl-services-categories" aria-label="Service categories">
                {serviceCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={activeCategory.toLowerCase() === category.toLowerCase() ? 'active' : ''}
                    aria-pressed={activeCategory.toLowerCase() === category.toLowerCase()}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="jl-services-empty" role="status">
                <Scissors size={48} aria-hidden="true" />
                <h3>No services found</h3>
                <p>Try another search or choose a different category.</p>
              </div>
            ) : (
              <div className={`jl-services-grid ${SERVICE_GRID_CLASSES}`}>
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onBook={openBooking}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="jl-booking-section" id="booking-form" tabIndex={-1}>
        {!selectedService ? (
          <div className="jl-booking-placeholder">
            <span><CalendarDays size={18} aria-hidden="true" /> Ready to book?</span>
            <h2>Select a service above to start your appointment booking.</h2>
            <p>Your selected service will appear here with a booking form for your contact details, date, time and special request.</p>
          </div>
        ) : formStatus === 'success' ? (
          <div className="jl-booking-success" role="status">
            <CheckCircle size={44} aria-hidden="true" />
            <h2>Booking Request Sent</h2>
            <p>{formMessage}</p>
            <button type="button" onClick={resetBooking}>Book Another Service</button>
          </div>
        ) : (
          <div className="jl-booking-layout">
            <aside className="jl-booking-summary">
              <button type="button" onClick={() => setSelectedService(null)}><ArrowLeft size={17} aria-hidden="true" /> Change Service</button>
              <ResponsiveImage src={selectedService.image} alt={selectedService.name} width={900} height={620} sizes="(max-width: 760px) 100vw, 38vw" />
              <span>{selectedService.category || 'Selected Service'}</span>
              <h2>{selectedService.name}</h2>
              <strong>{money(selectedService.price)}</strong>
              <p>{selectedService.description || 'Professional JayLuxe beauty and lifestyle appointment.'}</p>
            </aside>

            <form onSubmit={handleSubmit} className="jl-booking-form" aria-describedby={formMessage ? 'service-booking-message' : undefined} noValidate>
              <div className="full">
                <span className="jl-form-label"><CalendarDays size={16} aria-hidden="true" /> Appointment Details</span>
                <h2>Book {selectedService.name}</h2>
              </div>

              <div>
                <label htmlFor="service-booking-name">Your Name *</label>
                <input id="service-booking-name" required type="text" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter your full name" />
              </div>
              <div>
                <label htmlFor="service-booking-email">Email Address</label>
                <input id="service-booking-email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Enter your email address" />
              </div>
              <div>
                <label htmlFor="service-booking-phone">Phone Number *</label>
                <input id="service-booking-phone" required type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Enter your phone number" />
              </div>
              <div>
                <label htmlFor="service-booking-date">Date *</label>
                <input id="service-booking-date" required type="date" min={today} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </div>
              <div>
                <label htmlFor="service-booking-time">Time *</label>
                <input id="service-booking-time" required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
              </div>
              <div className="full">
                <label htmlFor="service-booking-notes">Additional Notes</label>
                <textarea id="service-booking-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Event type, preferred look, location or other details" rows={5} />
              </div>
              <div className="jl-honeypot" aria-hidden="true">
                <label htmlFor="service-booking-website">Website</label>
                <input id="service-booking-website" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} tabIndex={-1} autoComplete="off" />
              </div>

              {formMessage && (
                <p id="service-booking-message" className={formStatus === 'error' ? 'jl-form-error' : 'jl-form-status'} role={formStatus === 'error' ? 'alert' : 'status'}>
                  {formMessage}
                </p>
              )}

              <button type="submit" disabled={formStatus === 'submitting'}>
                {formStatus === 'submitting' ? <><LoaderCircle className="jl-spin" size={18} aria-hidden="true" /> Sending Booking…</> : <>Confirm Booking <ArrowRight size={18} aria-hidden="true" /></>}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="jl-services-final-cta">
        <h2>Need help choosing a service?</h2>
        <p>Contact JayLuxe and we will help you choose the right beauty service for your occasion.</p>
        <Link href="/gallery" className="jl-services-btn gold">View Our Gallery <ArrowRight size={18} aria-hidden="true" /></Link>
      </section>

      <Footer />
    </main>
  );
}
