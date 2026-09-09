'use client';


import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import FocusLock from 'react-focus-lock';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Search,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTransformations } from '@/lib/transformations';
import { getBridalGalleryImages, GalleryImage } from '@/lib/gallery';
import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import ResponsiveImage from '@/components/ResponsiveImage';
import { GALLERY_GRID_CLASSES } from '@/lib/layoutClasses';

type UnifiedGalleryItem = {
  id: string;
  image: string;
  title: string;
  category: string;
  description: string;
};

const galleryCategories = [
  'All',
  'Bridal',
  'Wig Installation',
  'Wig Revamp',
  'Wig Styling',
  'Makeup',
  'Gele',
  'Dreadlocks',
  'Pedicure',
];

const ITEMS_PER_PAGE = 9;

export default function GalleryPage() {
  const [items, setItems] = useState<UnifiedGalleryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<UnifiedGalleryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const lightboxViewportRef = useRef<HTMLDivElement | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [pinchState, setPinchState] = useState<{ distance: number; zoom: number } | null>(null);
  const [dragAnchor, setDragAnchor] = useState<{ x: number; y: number } | null>(null);
  const [navDirection, setNavDirection] = useState(0);

  useEffect(() => {
    async function loadGallery() {
      try {
        setError('');

        const [transformations, bridalImages] = await Promise.all([
          getTransformations(),
          getBridalGalleryImages(),
        ]);

        const transformationItems: UnifiedGalleryItem[] = transformations
          .filter((item) => item.afterImage || item.beforeImage)
          .map((item) => ({
            id: `transformation-${item.id}`,
            image: item.afterImage || item.beforeImage || '',
            title: item.title || 'Customer Transformation',
            category: item.category || 'Transformation',
            description:
              item.description ||
              'A professional Jayluxe before-and-after transformation.',
          }));

        const bridalItems: UnifiedGalleryItem[] = bridalImages
          .filter((item) => item.image || item.imageUrl)
          .map((item: GalleryImage & { caption?: string }) => ({
            id: `gallery-${item.id}`,
            image: item.image || item.imageUrl || '',
            title: item.title || item.caption || 'Jayluxe Bridal Look',
            category: item.category || 'Bridal',
            description:
              item.description ||
              item.caption ||
              'A beautiful Jayluxe beauty and lifestyle portfolio image.',
          }));

        setItems([...transformationItems, ...bridalItems]);
      } catch (err) {
        console.error('Failed to load gallery:', err);
        setError('Gallery could not load. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadGallery();
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' ||
        item.category.toLowerCase().includes(activeCategory.toLowerCase());

      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const selectedIndex = selectedImage
    ? filteredItems.findIndex((item) => item.id === selectedImage.id)
    : -1;

  function resetLightboxTransform() {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setPinchState(null);
    setDragAnchor(null);
    setTouchStartX(null);
    setTouchStartY(null);
  }

  function clampPan(x: number, y: number, nextZoom: number) {
    const viewportRect = lightboxViewportRef.current?.getBoundingClientRect();

    if (!viewportRect || nextZoom <= 1) {
      return { x: 0, y: 0 };
    }

    const maxX = (viewportRect.width * (nextZoom - 1)) / 2;
    const maxY = (viewportRect.height * (nextZoom - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function getTouchDistance(touches: React.TouchList) {
    if (touches.length < 2) return 0;

    const [firstTouch, secondTouch] = [touches[0], touches[1]];
    const deltaX = secondTouch.clientX - firstTouch.clientX;
    const deltaY = secondTouch.clientY - firstTouch.clientY;

    return Math.hypot(deltaX, deltaY);
  }

  function handleGalleryTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      setPinchState({ distance: getTouchDistance(event.touches), zoom });
      setDragAnchor(null);
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);

    if (zoom > 1) {
      setDragAnchor({
        x: touch.clientX - panOffset.x,
        y: touch.clientY - panOffset.y,
      });
    }
  }

  function handleGalleryTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2 && pinchState) {
      event.preventDefault();

      const distance = getTouchDistance(event.touches);
      const nextZoom = Math.max(1, Math.min(4, pinchState.zoom * (distance / pinchState.distance)));
      setZoom(nextZoom);
      setPanOffset((currentOffset) => clampPan(currentOffset.x, currentOffset.y, nextZoom));
      return;
    }

    if (event.touches.length === 1 && zoom > 1 && dragAnchor) {
      event.preventDefault();
      const touch = event.touches[0];
      setPanOffset(clampPan(touch.clientX - dragAnchor.x, touch.clientY - dragAnchor.y, zoom));
    }
  }

  function handleGalleryTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (pinchState && event.touches.length < 2) {
      setPinchState(null);
      setDragAnchor(null);

      if (zoom <= 1.02) {
        resetLightboxTransform();
      }
      return;
    }

    if (zoom > 1) {
      if (event.touches.length === 0) {
        setDragAnchor(null);
      }
      return;
    }

    if (touchStartX === null || touchStartY === null) return;

    const endTouch = event.changedTouches[0];
    if (!endTouch) return;

    const deltaX = endTouch.clientX - touchStartX;
    const deltaY = endTouch.clientY - touchStartY;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) nextImage();
      else previousImage();
    }

    setTouchStartX(null);
    setTouchStartY(null);
  }

  function changeCategory(category: string) {
    setActiveCategory(category);
    setCurrentPage(1);
  }

  function clearSearch() {
    setSearchQuery('');
    setCurrentPage(1);
  }

  function nextImage() {
    if (selectedIndex < filteredItems.length - 1) {
      resetLightboxTransform();
      setNavDirection(1);
      setSelectedImage(filteredItems[selectedIndex + 1]);
    }
  }

  function previousImage() {
    if (selectedIndex > 0) {
      resetLightboxTransform();
      setNavDirection(-1);
      setSelectedImage(filteredItems[selectedIndex - 1]);
    }
  }


  useEffect(() => {
    if (!selectedImage) return;

    const currentImage = selectedImage;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        resetLightboxTransform();
        setSelectedImage(null);
        return;
      }
      const index = filteredItems.findIndex((item) => item.id === currentImage.id);
      if (event.key === 'ArrowLeft' && index > 0) {
        resetLightboxTransform();
        setNavDirection(-1);
        setSelectedImage(filteredItems[index - 1]);
      }
      if (event.key === 'ArrowRight' && index < filteredItems.length - 1) {
        resetLightboxTransform();
        setNavDirection(1);
        setSelectedImage(filteredItems[index + 1]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, filteredItems]);

  return (
    <main className="jl-gallery-page">
      <section className="jl-gallery-hero">
        <div className="jl-gallery-hero-overlay" />

        <div className="jl-gallery-hero-content">
          <PageHeroIcon icon={ImageIcon} label="JayLuxe gallery" />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="jl-gallery-badge">
              Beauty Portfolio
            </span>

            <h1>Jayluxe Gallery</h1>

            <p>
              Explore our bridal beauty, wig transformations, makeup, gele,
              dreadlocks and luxury lifestyle portfolio.
            </p>

            <div className="jl-gallery-hero-actions">
              <a href="#gallery" className="jl-gallery-btn gold">
                Explore Gallery
                <ArrowRight size={18} />
              </a>

              <Link href="/services" className="jl-gallery-btn outline">
                Book a Service
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="jl-gallery-stats">
        <div>
          <strong>500+</strong>
          <span>Happy Customers</span>
        </div>

        <div>
          <strong>200+</strong>
          <span>Beauty Appointments</span>
        </div>

        <div>
          <strong>100+</strong>
          <span>Transformations</span>
        </div>

        <div>
          <strong>4.9/5</strong>
          <span>Average Rating</span>
        </div>
      </section>

      <section className="jl-gallery-section" id="gallery">
        <div className="jl-gallery-heading">
          <span>Our Work</span>
          <h2>Beauty, Bridal & Transformation Gallery</h2>
          <p>
            Browse real Jayluxe work by category or search for a service style.
          </p>
        </div>

        <div className="jl-gallery-toolbar">
          <div className="jl-gallery-search">
            <Search size={20} aria-hidden="true" />
            <label className="sr-only" htmlFor="gallery-search">Search the JayLuxe gallery</label>

            <input
              id="gallery-search"
              type="search"
              aria-label="Search the JayLuxe gallery"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search gallery..."
            />

            {searchQuery && (
              <button type="button" onClick={clearSearch} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="jl-gallery-filters">
            {galleryCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => changeCategory(category)}
                className={activeCategory === category ? 'active' : ''}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={`jl-gallery-grid ${GALLERY_GRID_CLASSES}`} role="status" aria-label="Loading gallery">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="jl-gallery-card skeleton">
                <div />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="jl-gallery-empty" role="alert">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="jl-gallery-empty">
            <h3>No gallery items found</h3>
            <p>Try another search or choose a different category.</p>
          </div>
        ) : (
          <>
            <div className={`jl-gallery-grid ${GALLERY_GRID_CLASSES}`}>
              {paginatedItems.map((item, index) => (
                <motion.article
                  key={item.id}
                  className="jl-gallery-card"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.04 }}
                >
                  <div
                    className="jl-gallery-image cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => { resetLightboxTransform(); setNavDirection(0); setSelectedImage(item); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        resetLightboxTransform();
                        setNavDirection(0);
                        setSelectedImage(item);
                      }
                    }}
                    aria-label={`Open ${item.title}`}
                  >
                    {item.image ? (
                      <ResponsiveImage src={item.image} alt={item.title} width={900} height={760} sizes="(max-width: 768px) 50vw, (max-width: 1100px) 50vw, 33vw" />
                    ) : (
                      <div className="jl-gallery-placeholder">
                        <ImageIcon size={34} aria-hidden="true" />
                      </div>
                    )}

                    <span>{item.category}</span>
                  </div>

                  <div className="jl-gallery-card-body">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <button type="button" onClick={() => { resetLightboxTransform(); setNavDirection(0); setSelectedImage(item); }} aria-label={`View details for ${item.title}`}>
                      View Detail
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="jl-pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="jl-gallery-cta">
        <h2>Love what you see?</h2>
        <p>
          Book Jayluxe for wig installation, makeup, gele, bridal styling,
          dreadlocks, pedicure and beauty services.
        </p>

        <Link href="/services" className="jl-gallery-btn gold">
          Book a Service
          <ArrowRight size={18} />
        </Link>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <FocusLock returnFocus>
            <motion.div
              className="jl-gallery-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onMouseDown={() => {
                resetLightboxTransform();
                setSelectedImage(null);
              }}
            >
              <motion.div
                className="jl-gallery-modal-card jl-gallery-modal-card--viewer"
                initial={{ opacity: 0, scale: 0.985, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.985, y: 10 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
                aria-describedby={modalDescriptionId}
              >
                <div className="sr-only">
                  <h2 id={modalTitleId}>{selectedImage.title}</h2>
                  <p id={modalDescriptionId}>{selectedImage.description}</p>
                </div>

                <button
                  type="button"
                  className="jl-gallery-modal-close"
                  onClick={() => {
                    resetLightboxTransform();
                    setSelectedImage(null);
                  }}
                  aria-label="Close gallery viewer"
                >
                  <X size={22} aria-hidden="true" />
                </button>

                {selectedIndex > 0 && (
                  <button type="button" className="jl-gallery-nav prev" onClick={previousImage} aria-label="Previous gallery image">
                    <ChevronLeft size={24} aria-hidden="true" />
                  </button>
                )}

                {selectedIndex < filteredItems.length - 1 && (
                  <button type="button" className="jl-gallery-nav next" onClick={nextImage} aria-label="Next gallery image">
                    <ChevronRight size={24} aria-hidden="true" />
                  </button>
                )}

                <div className="jl-gallery-lightbox-stage">
                  <div
                    ref={lightboxViewportRef}
                    className={`jl-gallery-modal-image jl-gallery-lightbox-viewport${zoom > 1 ? ' is-zoomed' : ''}`}
                    onTouchStart={handleGalleryTouchStart}
                    onTouchMove={handleGalleryTouchMove}
                    onTouchEnd={handleGalleryTouchEnd}
                  >
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={selectedImage.id}
                        className="jl-gallery-lightbox-track"
                        initial={{
                          opacity: 0,
                          x: navDirection > 0 ? 36 : navDirection < 0 ? -36 : 0,
                          scale: 0.99,
                        }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          x: navDirection > 0 ? -36 : navDirection < 0 ? 36 : 0,
                          scale: 0.99,
                        }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div
                          className="jl-gallery-lightbox-panzoom"
                          style={{
                            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`,
                          }}
                        >
                          <ResponsiveImage
                            src={selectedImage.image}
                            alt={selectedImage.title}
                            width={1600}
                            height={1600}
                            sizes="100vw"
                            className="jl-gallery-lightbox-image"
                            priority
                          />
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="jl-gallery-lightbox-counter" aria-live="polite">
                    {selectedIndex + 1}/{filteredItems.length}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </FocusLock>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}