'use client';


import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import FocusLock from 'react-focus-lock';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Search,
  Share2,
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
  const [shareMessage, setShareMessage] = useState('');
  const modalTitleId = useId();
  const modalDescriptionId = useId();

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
      setSelectedImage(filteredItems[selectedIndex + 1]);
    }
  }

  function previousImage() {
    if (selectedIndex > 0) {
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
        setSelectedImage(null);
        return;
      }
      const index = filteredItems.findIndex((item) => item.id === currentImage.id);
      if (event.key === 'ArrowLeft' && index > 0) setSelectedImage(filteredItems[index - 1]);
      if (event.key === 'ArrowRight' && index < filteredItems.length - 1) setSelectedImage(filteredItems[index + 1]);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, filteredItems]);

  async function shareImage() {
    if (!selectedImage) return;

    const shareData = {
      title: `Jayluxe Gallery: ${selectedImage.title}`,
      text: selectedImage.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage('Share menu opened.');
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setShareMessage('Gallery link copied to your clipboard.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareMessage('The gallery link could not be shared.');
    }
  }

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
                  <div className="jl-gallery-image">
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

                    <button type="button" onClick={() => { setShareMessage(''); setSelectedImage(item); }} aria-label={`View details for ${item.title}`}>
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
              onMouseDown={() => setSelectedImage(null)}
            >
              <motion.div
                className="jl-gallery-modal-card"
                initial={{ scale: 0.98, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.98, y: 8 }}
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
                aria-describedby={modalDescriptionId}
              >
                <button
                  type="button"
                  className="jl-gallery-modal-close"
                  onClick={() => setSelectedImage(null)}
                  aria-label="Close gallery detail"
                >
                  <X size={22} aria-hidden="true" />
                </button>

                <div className="jl-gallery-modal-image">
                  <ResponsiveImage
                    src={selectedImage.image}
                    alt={selectedImage.title}
                    width={1100}
                    height={900}
                    sizes="(max-width: 760px) 100vw, 62vw"
                  />
                </div>

                <div className="jl-gallery-modal-info">
                  <span>{selectedImage.category}</span>
                  <h2 id={modalTitleId}>{selectedImage.title}</h2>
                  <p id={modalDescriptionId}>{selectedImage.description}</p>

                  <div className="jl-gallery-modal-actions">
                    <button type="button" onClick={() => void shareImage()}>
                      <Share2 size={18} aria-hidden="true" /> Share
                    </button>
                    <Link href="/services">
                      Book Similar Look <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </div>
                  {shareMessage && <p className="jl-gallery-share-status" role="status">{shareMessage}</p>}
                </div>

                {selectedIndex > 0 && (
                  <button type="button" className="jl-gallery-nav prev" onClick={previousImage} aria-label="Previous gallery image">
                    <ChevronLeft size={30} aria-hidden="true" />
                  </button>
                )}
                {selectedIndex < filteredItems.length - 1 && (
                  <button type="button" className="jl-gallery-nav next" onClick={nextImage} aria-label="Next gallery image">
                    <ChevronRight size={30} aria-hidden="true" />
                  </button>
                )}
              </motion.div>
            </motion.div>
          </FocusLock>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}