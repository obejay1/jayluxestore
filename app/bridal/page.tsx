'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Crown,
  Heart,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

import {
  getBridalPackages,
  type BridalPackage,
} from '@/lib/bridal';
import Footer from '@/components/Footer';
import ResponsiveImage from '@/components/ResponsiveImage';
import { getSafeImageSource } from '@/lib/images';
import PageHeroIcon from '@/components/PageHeroIcon';
import { BRIDAL_GRID_CLASSES } from '@/lib/layoutClasses';

const fallbackImage = '/product-placeholder.png';

type BridalPackageWithPopular = BridalPackage & {
  popular?: boolean;
};

const money = (amount?: number) => {
  const value = Number(amount ?? 0);

  return `₦${Math.round(Number.isFinite(value) ? value : 0).toLocaleString()}`;
};

function getPackageName(pkg: BridalPackage) {
  return pkg.title?.trim() || pkg.name?.trim() || 'Bridal Package';
}

function getPackageImage(pkg: BridalPackage) {
  return getSafeImageSource(pkg.image, fallbackImage);
}

export default function BridalPage() {
  const [packages, setPackages] = useState<
    BridalPackageWithPopular[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPackages() {
      try {
        setLoading(true);
        setError(null);

        const data = await getBridalPackages();

        if (!cancelled) {
          setPackages(data as BridalPackageWithPopular[]);
        }
      } catch (loadError) {
        console.error(
          'Failed to load bridal packages:',
          loadError,
        );

        if (!cancelled) {
          setError(
            'Failed to load bridal packages. Please try again later.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPackages();

    return () => {
      cancelled = true;
    };
  }, []);

  const allFeatures = useMemo(() => {
    const features = new Set<string>();

    packages.forEach((pkg) => {
      (pkg.features ?? []).forEach((feature) => {
        const cleanFeature = feature.trim();

        if (cleanFeature) {
          features.add(cleanFeature);
        }
      });
    });

    return Array.from(features).slice(0, 8);
  }, [packages]);

  return (
    <main className="jl-bridal-page">
      <section className="jl-bridal-hero">
        <div className="jl-bridal-hero-bg">
          <Image
            src={fallbackImage}
            alt="Jayluxe bridal beauty"
            fill
            priority
            sizes="100vw"
            className="jl-bridal-hero-img"
          />
        </div>

        <div className="jl-bridal-hero-overlay" />

        <div className="jl-bridal-hero-inner">
          <motion.div
            className="jl-bridal-hero-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <PageHeroIcon icon={Crown} label="Bridal packages" />
            <span className="jl-bridal-badge">
              Jayluxe Bridal Experience
            </span>

            <h1>Make Your Special Day Unforgettable</h1>

            <p>
              Premium bridal makeup, gele styling, wig
              installation and luxury beauty preparation
              designed to make you look flawless on your big
              day.
            </p>

            <div className="jl-bridal-hero-actions">
              <a
                href="#packages"
                className="jl-bridal-btn gold"
              >
                View Packages
                <ArrowRight size={18} aria-hidden="true" />
              </a>

              <Link
                href="/gallery"
                className="jl-bridal-btn outline"
              >
                View Bridal Gallery
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        className="jl-bridal-trust"
        aria-label="Jayluxe bridal benefits"
      >
        <div>
          <Crown aria-hidden="true" />
          <strong>Luxury Bridal Look</strong>
          <span>Premium styling for your big day</span>
        </div>

        <div>
          <ShieldCheck aria-hidden="true" />
          <strong>Professional Service</strong>
          <span>Reliable beauty preparation</span>
        </div>

        <div>
          <Heart aria-hidden="true" />
          <strong>Personal Consultation</strong>
          <span>Designed around your style</span>
        </div>

        <div className="jl-bridal-delivery-note">
          <Truck aria-hidden="true" />
          <strong>Available Across Nigeria</strong>
          <span>Book early for your date</span>
        </div>
      </section>

      <section className="jl-bridal-intro">
        <span>👰 Bridal Packages</span>
        <h2>Choose Your Perfect Package</h2>

        <p>
          Select the bridal package that matches your event,
          beauty needs and budget. Every package is crafted to
          give you a polished, elegant and camera-ready look.
        </p>
      </section>

      <section
        className="jl-bridal-packages"
        id="packages"
        aria-busy={loading}
      >
        {loading ? (
          <div
            className={`jl-bridal-grid ${BRIDAL_GRID_CLASSES}`}
            aria-label="Loading bridal packages"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="jl-bridal-card skeleton"
                aria-hidden="true"
              >
                <div className="jl-skeleton image" />
                <div className="jl-skeleton line wide" />
                <div className="jl-skeleton line" />
                <div className="jl-skeleton line short" />
                <div className="jl-skeleton button" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            className="jl-bridal-message error"
            role="alert"
          >
            {error}
          </div>
        ) : packages.length === 0 ? (
          <div className="jl-bridal-message">
            No bridal packages available yet.
          </div>
        ) : (
          <div
            className={`jl-bridal-grid ${BRIDAL_GRID_CLASSES}${
              packages.length === 1 ? ' single' : ''
            }`}
          >
            {packages.map((pkg, index) => {
              const packageName = getPackageName(pkg);
              const packageImage = getPackageImage(pkg);
              const isPopular = Boolean(
                pkg.popular || pkg.featured,
              );

              return (
                <motion.article
                  key={pkg.id}
                  className={
                    isPopular
                      ? 'jl-bridal-card popular'
                      : 'jl-bridal-card'
                  }
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{
                    once: true,
                    amount: 0.25,
                  }}
                  transition={{
                    duration: 0.42,
                    delay: index * 0.06,
                  }}
                >
                  {isPopular && (
                    <div className="jl-popular-badge">
                      Most Popular
                    </div>
                  )}

                  <div className="jl-bridal-card-image">
                    <ResponsiveImage
                      src={packageImage}
                      alt={`${packageName} bridal package`}
                      fill
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                      style={{
                        objectFit: 'cover',
                      }}
                    />
                  </div>

                  <div className="jl-bridal-card-body">
                    <div className="jl-bridal-card-top">
                      <div>
                        <span>Bridal Package</span>
                        <h3>{packageName}</h3>
                      </div>

                      <div className="jl-bridal-card-price">
                        <small>Starting at</small>
                        <strong>{money(pkg.price)}</strong>
                      </div>
                    </div>

                    <p className="jl-bridal-desc">
                      {pkg.description?.trim() ||
                        'A beautiful bridal package designed for a polished and elegant wedding day look.'}
                    </p>

                    {(pkg.features ?? []).length > 0 && (
                      <ul className="jl-bridal-features">
                        {(pkg.features ?? [])
                          .slice(0, 3)
                          .map((feature, featureIndex) => (
                            <li
                              key={`${pkg.id}-${feature}-${featureIndex}`}
                            >
                              <Check
                                size={17}
                                aria-hidden="true"
                              />
                              {feature}
                            </li>
                          ))}

                        {(pkg.features ?? []).length > 3 ? (
                          <li className="jl-bridal-more-features">
                            +{(pkg.features ?? []).length - 3} more included
                          </li>
                        ) : null}
                      </ul>
                    )}

                    <Link
                      href={`/bridal/book?package=${encodeURIComponent(
                        packageName,
                      )}`}
                      className="jl-bridal-book"
                    >
                      Book{' '}
                      {packageName.split(' ')[0] ||
                        'Bridal'}{' '}
                      Package
                      <ArrowRight
                        size={17}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {packages.length > 0 &&
        allFeatures.length > 0 && (
          <section className="jl-bridal-compare">
            <div className="jl-bridal-intro compact">
              <span>👑 Feature Comparison</span>
              <h2>Compare Bridal Packages</h2>

              <p>
                Review what is included in each package before
                booking.
              </p>
            </div>

            <div className="jl-compare-table-wrap">
              <table className="jl-compare-table">
                <caption className="sr-only">
                  Comparison of Jayluxe bridal packages
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Feature</th>

                    {packages.map((pkg) => (
                      <th scope="col" key={pkg.id}>
                        {getPackageName(pkg)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {allFeatures.map((feature) => (
                    <tr key={feature}>
                      <th scope="row">{feature}</th>

                      {packages.map((pkg) => {
                        const hasFeature = (
                          pkg.features ?? []
                        ).some(
                          (item) =>
                            item.toLowerCase().trim() ===
                            feature.toLowerCase().trim(),
                        );

                        return (
                          <td
                            key={`${pkg.id}-${feature}`}
                            aria-label={
                              hasFeature
                                ? 'Included'
                                : 'Not included'
                            }
                          >
                            {hasFeature ? (
                              <Check
                                className="jl-check"
                                size={18}
                                aria-hidden="true"
                              />
                            ) : (
                              <X
                                className="jl-x"
                                size={18}
                                aria-hidden="true"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      <section className="jl-bridal-showcase">
        <div className="jl-bridal-showcase-card">
          <div className="jl-bridal-showcase-image">
            <Image
              src={fallbackImage}
              alt="Jayluxe bridal beauty testimonial"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{
                objectFit: 'cover',
              }}
            />
          </div>

          <div className="jl-bridal-showcase-content">
            <span>
              Verified Bride Experience
            </span>

            <blockquote>
              “Jayluxe made me feel like a queen on my wedding
              day. The look was elegant, clean, and lasted
              beautifully throughout the event.”
            </blockquote>

            <cite>— Jayluxe Bride</cite>

            <Link
              href="/gallery"
              className="jl-bridal-btn gold"
            >
              View Bridal Gallery
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="jl-bridal-faq">
        <div className="jl-bridal-intro compact">
          <span>Questions</span>
          <h2>Before You Book</h2>
        </div>

        <div className="jl-faq-grid">
          <article>
            <h3>When should I book?</h3>
            <p>
              Book as early as possible so your wedding date
              can be reserved.
            </p>
          </article>

          <article>
            <h3>Can I request a custom package?</h3>
            <p>
              Yes. You can contact Jayluxe for a custom bridal
              beauty package.
            </p>
          </article>

          <article>
            <h3>Do you offer gele and wig styling?</h3>
            <p>
              Yes. Bridal makeup, gele, wig styling and beauty
              preparation can be included.
            </p>
          </article>
        </div>
      </section>

      <section className="jl-bridal-final-cta">
        <h2>
          Ready to book your bridal beauty experience?
        </h2>

        <p>
          Choose your package and let Jayluxe help you create
          a beautiful wedding day look.
        </p>

        <Link
          href="/services"
          className="jl-bridal-btn gold"
        >
          Book Appointment
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <Footer />
    </main>
  );
}