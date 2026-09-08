'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';
import ResponsiveImage from '@/components/ResponsiveImage';

type Props = {
  images: string[];
  initialIndex: number;
  productName: string;
  onClose: () => void;
};

export default function ProductImageLightbox({ images, initialIndex, productName, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    setStatus('loading');
    setScale(1);

    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') previous();
    };

    window.addEventListener('keydown', key);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', key);
    };
  }, [index, retryKey, onClose]);

  const previous = () => {
    setIndex((i) => (i - 1 + images.length) % images.length);
    setStatus('loading');
  };

  const next = () => {
    setIndex((i) => (i + 1) % images.length);
    setStatus('loading');
  };

  const retry = () => {
    setStatus('loading');
    setRetryKey((k) => k + 1);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const end = e.changedTouches[0]?.clientX ?? touchStart;

    if (Math.abs(touchStart - end) > 50) {
      touchStart > end ? next() : previous();
    }

    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black/95 p-2 md:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Product image viewer"
      onTouchStart={(e) => setTouchStart(e.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={handleTouchEnd}
    >
      <div aria-live="polite" className="sr-only">
        {status === 'loading' ? 'Loading image' : status === 'error' ? 'Unable to load image' : 'Image loaded'}
      </div>

      <button
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 rounded-full border border-[#c9a227]/60 bg-black/70 p-3 text-[#c9a227]"
      >
        <X size={28} />
      </button>

      <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] -translate-x-1/2 rounded-full border border-[#c9a227]/40 bg-black/70 px-4 py-2 text-sm text-[#c9a227]">
        {index + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <>
          <button aria-label="Previous image" onClick={previous} className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#c9a227]/60 bg-black/70 p-3 text-[#c9a227]">
            <ChevronLeft size={34} />
          </button>
          <button aria-label="Next image" onClick={next} className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#c9a227]/60 bg-black/70 p-3 text-[#c9a227]">
            <ChevronRight size={34} />
          </button>
        </>
      )}

      <div
        className="relative flex h-full w-full max-w-7xl items-center justify-center overflow-hidden rounded-xl bg-white/5"
        onClick={(event) => event.stopPropagation()}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-[#c9a227]" aria-hidden="true">
            <Loader2 className="animate-spin" size={34} />
            <span className="mt-3 text-sm">Loading image…</span>
          </div>
        )}

        {status === 'error' ? (
          <div className="z-10 flex flex-col items-center gap-3 text-center text-white">
            <p>Unable to load image</p>
            <button onClick={retry} className="flex items-center gap-2 rounded-full bg-[#c9a227] px-5 py-2 text-black">
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        ) : (
          <ResponsiveImage
            key={`${images[index]}-${retryKey}`}
            src={images[index]}
            alt={`${productName} image ${index + 1}`}
            width={1600}
            height={1600}
            sizes="100vw"
            className={`max-h-full max-w-full object-contain transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-30 blur-sm'}`}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            style={{ transform: `scale(${scale})`, transition: 'transform .2s ease' }}
          />
        )}
      </div>
    </div>
  );
}
