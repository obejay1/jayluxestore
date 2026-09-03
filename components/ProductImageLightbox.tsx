'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
    };

    window.addEventListener('keydown', key);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', key);
    };
  }, [images.length, onClose]);

  const previous = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

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
      role="dialog"
      aria-modal="true"
      aria-label="Product image viewer"
      onTouchStart={(e) => setTouchStart(e.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 rounded-full border border-[#c9a227]/60 bg-black/70 p-3 text-[#c9a227] backdrop-blur-sm transition hover:bg-[#c9a227] hover:text-black"
      >
        <X size={28} />
      </button>

      <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] -translate-x-1/2 rounded-full border border-[#c9a227]/40 bg-black/70 px-4 py-2 text-sm font-medium text-[#c9a227]">
        {index + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <button
          aria-label="Previous image"
          onClick={previous}
          className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#c9a227]/60 bg-black/70 p-3 text-[#c9a227] backdrop-blur-sm transition hover:bg-[#c9a227] hover:text-black"
        >
          <ChevronLeft size={34} />
        </button>
      )}

      <div
        className="flex aspect-video w-full max-w-7xl items-center justify-center overflow-hidden rounded-xl bg-white/5"
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
      >
        <ResponsiveImage
          src={images[index]}
          alt={`${productName} image ${index + 1}`}
          width={1600}
          height={1600}
          sizes="100vw"
          className="h-full w-full object-contain"
          style={{
            transform: `scale(${scale})`,
            transition: 'transform .2s ease',
          }}
        />
      </div>

      {images.length > 1 && (
        <button
          aria-label="Next image"
          onClick={next}
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#c9a227]/60 bg-black/70 p-3 text-[#c9a227] backdrop-blur-sm transition hover:bg-[#c9a227] hover:text-black"
        >
          <ChevronRight size={34} />
        </button>
      )}
    </div>
  );
}
