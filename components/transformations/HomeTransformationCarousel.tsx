'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transformation } from '@/lib/types';
import { getResponsiveDeliverySource } from '@/lib/images';
import styles from './transformations.module.css';

type Props = {
  items: Transformation[];
};

export default function HomeTransformationCarousel({ items }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || !items.length) return;
    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    const child = track.children.item(nextIndex) as HTMLElement | null;
    if (child) track.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    setActiveIndex(nextIndex);
  }, [items.length]);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const left = track.scrollLeft;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    Array.from(track.children).forEach((node, index) => {
      const el = node as HTMLElement;
      const current = Math.abs(el.offsetLeft - left);
      if (current < distance) {
        distance = current;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  }, []);

  if (!items.length) return null;

  return (
    <section className={styles.homeSection} aria-labelledby="home-transformations-title">
      <div className={styles.homeHeader}>
        <div>
          <p className={styles.eyebrow}>Before &amp; After</p>
          <h2 id="home-transformations-title" className={styles.homeTitle}>Real Customer Transformations</h2>
        </div>
        <Link href="/before-after" className={styles.homeViewAll}>
          Before &amp; After <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.carouselShell}>
        <div
          ref={trackRef}
          className={styles.carouselTrack}
          aria-label="Real customer transformations"
          onScroll={handleScroll}
        >
          {items.map((item) => (
            <Link
              href={`/gallery?transformation=${encodeURIComponent(item.id)}`}
              key={item.id}
              className={styles.homeCard}
            >
              <div className={styles.homeImages}>
                <div className={styles.homeImagePane}>
                  <span className={styles.imageLabel}>BEFORE</span>
                  <Image
                    src={getResponsiveDeliverySource(item.beforeImage, 520)}
                    alt={`${item.title} before`}
                    fill
                    sizes="(max-width: 640px) 44vw, 180px"
                    className={styles.homeImage}
                  />
                </div>
                <div className={styles.homeImagePane}>
                  <span className={`${styles.imageLabel} ${styles.afterLabel}`}>AFTER</span>
                  <Image
                    src={getResponsiveDeliverySource(item.afterImage, 520)}
                    alt={`${item.title} after`}
                    fill
                    sizes="(max-width: 640px) 44vw, 180px"
                    className={styles.homeImage}
                  />
                </div>
              </div>
              <div className={styles.homeContent}>
                {item.category ? <p className={styles.category}>{item.category}</p> : null}
                <h3 className={styles.homeCardTitle}>{item.title}</h3>
                <span className={styles.homeCardCta}>View transformation <ArrowRight size={13} aria-hidden="true" /></span>
              </div>
            </Link>
          ))}
        </div>

        {items.length > 1 ? (
          <div className={styles.carouselControls}>
            <div className={styles.arrowGroup}>
              <button
                type="button"
                className={styles.carouselArrow}
                onClick={() => scrollToIndex(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Previous transformation"
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.carouselArrow}
                onClick={() => scrollToIndex(activeIndex + 1)}
                disabled={activeIndex === items.length - 1}
                aria-label="Next transformation"
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.dots} aria-label="Transformation slides">
              {items.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ''}`}
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Show transformation ${index + 1}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
