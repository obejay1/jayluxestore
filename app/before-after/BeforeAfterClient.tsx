'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Transformation } from '@/lib/types';
import { getResponsiveDeliverySource } from '@/lib/images';
import styles from '@/components/transformations/transformations.module.css';

type Category = { id: string; name: string };
type Side = 'before' | 'after';
type ViewerState = { itemId: string; side: Side };

export default function BeforeAfterClient({ items, categories }: { items: Transformation[]; categories: Category[] }) {
  const [active, setActive] = useState('All');
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const filtered = useMemo(
    () => active === 'All' ? items : items.filter((item) => item.category === active),
    [active, items],
  );

  const currentItem = viewer ? items.find((item) => item.id === viewer.itemId) ?? null : null;
  const currentSource = currentItem && viewer
    ? viewer.side === 'before'
      ? currentItem.beforeImage
      : currentItem.afterImage
    : '';

  const switchSide = useCallback((_direction: -1 | 1) => {
    setViewer((current) => {
      if (!current) return null;
      const nextSide: Side = current.side === 'before' ? 'after' : 'before';
      return { ...current, side: nextSide };
    });
    setImageLoading(true);
    setImageError(false);
  }, []);

  useEffect(() => {
    if (!viewer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewer(null);
      if (event.key === 'ArrowLeft') switchSide(-1);
      if (event.key === 'ArrowRight') switchSide(1);
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewer, switchSide]);

  const openViewer = (itemId: string, side: Side) => {
    setViewer({ itemId, side });
    setImageLoading(true);
    setImageError(false);
  };

  return (
    <>
      <section className={styles.filters} aria-label="Transformation categories">
        {['All', ...categories.map((category) => category.name)].map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setActive(category)}
            className={`${styles.filterButton} ${active === category ? styles.filterActive : ''}`}
            aria-pressed={active === category}
          >
            {category}
          </button>
        ))}
      </section>

      <section className={styles.grid} aria-live="polite">
        {filtered.length ? filtered.map((item) => (
          <article className={styles.gridCard} key={item.id}>
            <div className={styles.gridImages}>
              <button
                type="button"
                className={styles.gridImageButton}
                onClick={() => openViewer(item.id, 'before')}
                aria-label={`Open ${item.title} before image`}
              >
                <span className={styles.imageLabel}>BEFORE</span>
                <Image
                  src={getResponsiveDeliverySource(item.beforeImage, 620)}
                  alt={`${item.title} before`}
                  fill
                  sizes="(max-width: 899px) 50vw, 25vw"
                  className={styles.gridImage}
                />
              </button>
              <button
                type="button"
                className={styles.gridImageButton}
                onClick={() => openViewer(item.id, 'after')}
                aria-label={`Open ${item.title} after image`}
              >
                <span className={`${styles.imageLabel} ${styles.afterLabel}`}>AFTER</span>
                <Image
                  src={getResponsiveDeliverySource(item.afterImage, 620)}
                  alt={`${item.title} after`}
                  fill
                  sizes="(max-width: 899px) 50vw, 25vw"
                  className={styles.gridImage}
                />
              </button>
            </div>
            <div className={styles.gridContent}>
              {item.category ? <p className={styles.category}>{item.category}</p> : null}
              <h2 className={styles.gridTitle}>{item.title}</h2>
              {item.description ? <p className={styles.description}>{item.description}</p> : null}
            </div>
          </article>
        )) : (
          <p className={styles.emptyState}>No transformations are available in this category yet.</p>
        )}
      </section>

      {viewer && currentItem ? (
        <div
          className={styles.viewer}
          role="dialog"
          aria-modal="true"
          aria-label={`${currentItem.title} ${viewer.side} image`}
          onClick={() => setViewer(null)}
          onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStartX.current == null) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) > 45) switchSide(delta > 0 ? -1 : 1);
          }}
        >
          <button type="button" className={styles.closeButton} onClick={() => setViewer(null)} aria-label="Close image viewer">
            <X size={20} aria-hidden="true" />
          </button>

          <button type="button" className={`${styles.lightboxButton} ${styles.prevButton}`} onClick={(event) => { event.stopPropagation(); switchSide(-1); }} aria-label="Previous image">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>

          <div className={styles.viewerStage} onClick={(event) => event.stopPropagation()}>
            {imageLoading && !imageError ? (
              <div className={styles.viewerLoading} aria-live="polite">
                <div className={styles.spinner} aria-hidden="true" />
              </div>
            ) : null}

            {imageError ? (
              <div className={styles.viewerError}>
                <strong>Image unavailable</strong>
                <p>This transformation image could not be loaded. Please try again later.</p>
              </div>
            ) : (
              <Image
                key={`${viewer.itemId}-${viewer.side}`}
                src={getResponsiveDeliverySource(currentSource, 1600)}
                alt={`${currentItem.title} ${viewer.side}`}
                fill
                priority
                sizes="100vw"
                className={styles.viewerImage}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            )}

            <span className={styles.viewerMeta}>{viewer.side.toUpperCase()} · {currentItem.title}</span>
          </div>

          <button type="button" className={`${styles.lightboxButton} ${styles.nextButton}`} onClick={(event) => { event.stopPropagation(); switchSide(1); }} aria-label="Next image">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </>
  );
}
