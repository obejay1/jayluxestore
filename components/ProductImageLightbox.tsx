'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ResponsiveImage from '@/components/ResponsiveImage';

type Props = {
  images: string[];
  initialIndex: number;
  productName: string;
  onClose: () => void;
};

export default function ProductImageLightbox({ images, initialIndex, productName, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [direction, setDirection] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<number | null>(null);
  const pinchZoom = useRef(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
    };
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function previous() {
    resetZoom();
    setDirection(-1);
    setStatus('loading');
    setIndex((current) => (current - 1 + images.length) % images.length);
  }

  function next() {
    resetZoom();
    setDirection(1);
    setStatus('loading');
    setIndex((current) => (current + 1) % images.length);
  }

  function distance(touches: React.TouchList) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
  }

  return (
    <div className="jl-product-lightbox" role="dialog" aria-modal="true" aria-label="Product image viewer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="jl-product-lightbox-close" onClick={onClose} aria-label="Close">
        <X size={24} />
      </button>

      <div className="jl-product-lightbox-counter">{index + 1} / {images.length}</div>

      {images.length > 1 && <>
        <button className="jl-product-lightbox-nav prev" onClick={previous} aria-label="Previous"><ChevronLeft /></button>
        <button className="jl-product-lightbox-nav next" onClick={next} aria-label="Next"><ChevronRight /></button>
      </>}

      <div className="jl-product-lightbox-stage" onClick={(e) => e.stopPropagation()}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            pinchStart.current = distance(event.touches);
            pinchZoom.current = zoom;
          } else {
            const touch = event.touches[0];
            if (touch) setTouchStart({ x: touch.clientX, y: touch.clientY });
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length === 2 && pinchStart.current) {
            const nextZoom = Math.min(4, Math.max(1, pinchZoom.current * distance(event.touches) / pinchStart.current));
            setZoom(nextZoom);
          }
        }}
        onTouchEnd={(event) => {
          if (touchStart && zoom === 1) {
            const touch = event.changedTouches[0];
            if (touch && Math.abs(touch.clientX - touchStart.x) > 50) {
              touch.clientX < touchStart.x ? next() : previous();
            }
          }
          pinchStart.current = null;
          setTouchStart(null);
        }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={images[index]} className="jl-product-lightbox-image-wrap"
            initial={{ opacity: 0, x: direction > 0 ? 35 : -35 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -35 : 35 }}
          >
            {status === 'loading' && <Loader2 className="jl-product-lightbox-loader" />}
            {status === 'error' ? (
              <button onClick={() => setStatus('loading')} className="jl-product-lightbox-retry"><RefreshCw size={16}/> Retry</button>
            ) : (
              <ResponsiveImage src={images[index]} alt={`${productName} image ${index + 1}`} width={1800} height={1800} sizes="100vw" priority
                className="jl-product-lightbox-image"
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
