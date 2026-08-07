'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import {
  ArrowRight,
  Truck,
  Shield,
  Headphones,
  Clock,
  Star,
  Scissors,
  MessageCircle,
  Mail,
  Sparkles,
} from 'lucide-react';
import { getSafeImageSource } from '@/lib/images';
import {
  CATEGORY_GRID_CLASSES,
  PRODUCT_GRID_CLASSES,
} from '@/lib/layoutClasses';
import { getProducts, getCategories } from '@/lib/store';
import { getTestimonials, Testimonial } from '@/lib/testimonials';
import { Product, Category, BridalPackage, Transformation } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import Footer from '@/components/Footer';
import { getBridalPackages } from '@/lib/bridal';
import { getFeaturedTransformations } from '@/lib/transformations';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_EMAIL_LINK,
  OFFICIAL_WHATSAPP_DISPLAY,
  OFFICIAL_WHATSAPP_URL,
} from '@/lib/contact';


type ProductShowcaseProps = {
  id?: string;
  eyebrow: string;
  title: string;
  href: string;
  products: Product[];
  onQuickView: (product: Product) => void;
};

function ProductShowcase({
  id,
  eyebrow,
  title,
  href,
  products,
  onQuickView,
}: ProductShowcaseProps) {
  if (products.length === 0) return null;

  return (
    <section className="jj-products jj-product-showcase" id={id}>
      <div className="jj-section-header">
        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
        </div>
        <Link href={href}>
          View All <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className={`jj-product-grid ${PRODUCT_GRID_CLASSES}`}>
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: index * 0.05 }}
          >
            <ProductCard p={product} onQuickView={onQuickView} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bridalPackages, setBridalPackages] = useState<BridalPackage[]>([]);
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    getProducts().then(setProducts)
    getCategories().then(setCategories)
    getTestimonials().then(t => setTestimonials(t.slice(0, 3)));
    getBridalPackages().then(items => setBridalPackages(items.slice(0, 3))).catch(() => setBridalPackages([]));
    getFeaturedTransformations(3).then(setTransformations).catch(() => setTransformations([]));
  }, []);


  const activeProducts = products.filter(
    (product) => product.active !== false && product.type !== 'service',
  );
  const featuredProducts = (
    activeProducts.filter((product) => product.featured).length > 0
      ? activeProducts.filter((product) => product.featured)
      : activeProducts
  ).slice(0, 8);
  const newArrivals = (
    activeProducts.filter((product) => product.isNew).length > 0
      ? activeProducts.filter((product) => product.isNew)
      : activeProducts
  ).slice(0, 8);
  const bestSellers = (
    activeProducts.filter((product) => product.bestseller).length > 0
      ? activeProducts.filter((product) => product.bestseller)
      : activeProducts
  ).slice(0, 8);
  const saleProducts = activeProducts
    .filter((product) => {
      const oldPrice = Number(product.oldPrice || 0);
      return Number(product.discount || 0) > 0 || oldPrice > Number(product.price || 0);
    })
    .slice(0, 8);

  const categoryImage = (category: Category) => {
    if (category.image) return getSafeImageSource(category.image);
    const match = products.find(
      (product) =>
        product.type !== 'service' &&
        product.image &&
        product.category?.trim().toLowerCase() === category.name.trim().toLowerCase(),
    );
    return getSafeImageSource(match?.image);
  };

  return (
    <main className="jj-home">
      {quickViewProduct && <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />}

      <section className="jj-hero">
        <div className="jj-hero-overlay" />

        <Image
          src="/hero-banner.png"
          alt="JayLuxe Nigerian beauty and lifestyle hero banner"
          fill
          priority
          sizes="100vw"
          className="jj-hero-img"
        />

        <motion.div 
          className="jj-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="jj-badge">
            <Sparkles size={16} />
            Premium Beauty & Lifestyle
          </div>

          <h1>Look Good, Live Clean</h1>

          <p>
            Premium hair products, beauty essentials, fashion accessories, gele,
            beads, kitchen accessories and professional beauty services across Nigeria.
          </p>

          <div className="jj-hero-buttons">
            <Link href="/shop" className="jj-btn jj-btn-gold">
              Shop Now <ArrowRight size={18} />
            </Link>

            <Link href="/services" className="jj-btn jj-btn-outline">
              Book a Service <Scissors size={18} />
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="jj-trust">
        <div>
          <Truck />
          <h3>Fast Delivery</h3>
          <p>Across Nigeria</p>
        </div>

        <div>
          <Shield />
          <h3>Quality Products</h3>
          <p>Trusted & reliable</p>
        </div>

        <div>
          <Headphones />
          <h3>Customer Support</h3>
          <p>We are here for you</p>
        </div>
      </section>

      <section className="jj-promo-rail" aria-label="JayLuxe promotions">
        <Link href="/flash-sale" className="jj-promo-featured">
          <span><Clock size={16} aria-hidden="true" /> Limited-time offers</span>
          <h2>Flash Sale</h2>
          <p>Shop selected beauty, fashion and lifestyle favourites while promotional stock lasts.</p>
          <strong>Shop the sale <ArrowRight size={17} aria-hidden="true" /></strong>
        </Link>

        <div className="jj-promo-pair">
          <Link href="/promotions" className="jj-promo-compact">
            <span><Sparkles size={16} aria-hidden="true" /> JayLuxe Offers</span>
            <h3>Seasonal promotions</h3>
            <p>Discover special offers, gift picks and curated luxury edits.</p>
            <strong>View promotions <ArrowRight size={17} aria-hidden="true" /></strong>
          </Link>

          <Link href="/best-sellers" className="jj-promo-compact">
            <span><Star size={16} aria-hidden="true" /> Customer favourites</span>
            <h3>Best-selling pieces</h3>
            <p>Explore the products our customers return to again and again.</p>
            <strong>Shop best sellers <ArrowRight size={17} aria-hidden="true" /></strong>
          </Link>
        </div>
      </section>

      <section className="jj-categories">
        <div className="jj-section-header jj-section-header-centered">
          <div>
            <small>Curated Departments</small>
            <h2>Shop by Category</h2>
          </div>
        </div>

        <div className={`jj-category-grid ${CATEGORY_GRID_CLASSES}`}>
          {categories.filter((category) => category.active !== false).map((category) => (
            <Link
              href={
                category.type === 'service'
                  ? `/services?category=${encodeURIComponent(category.name)}`
                  : `/shop?category=${encodeURIComponent(category.name)}`
              }
              key={category.id}
              className="jj-category-card"
            >
              <span className="jj-category-image">
                <Image
                  src={categoryImage(category)}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  className="jj-category-image-element"
                />
                <span className="jj-category-image-overlay" />
                <span className="jj-category-label">
                  {category.type === 'service' ? 'Service' : 'Collection'}
                </span>
              </span>
              <span className="jj-category-content">
                <strong>{category.name}</strong>
                <small>
                  {category.description ||
                    (category.type === 'service'
                      ? 'Book premium care'
                      : 'Explore the collection')}
                </small>
                <span className="jj-category-explore">Explore <ArrowRight size={16} /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ProductShowcase
        id="products"
        eyebrow="Curated by JayLuxe"
        title="Featured Products"
        href="/featured-products"
        products={featuredProducts}
        onQuickView={setQuickViewProduct}
      />

      {saleProducts.length > 0 ? (
        <ProductShowcase
          eyebrow="Limited-Time Prices"
          title="Flash Sale"
          href="/flash-sale"
          products={saleProducts}
          onQuickView={setQuickViewProduct}
        />
      ) : null}

      <ProductShowcase
        eyebrow="Just Arrived"
        title="New Arrivals"
        href="/new-arrivals"
        products={newArrivals}
        onQuickView={setQuickViewProduct}
      />

      <ProductShowcase
        eyebrow="Customer Favourites"
        title="Best Sellers"
        href="/best-sellers"
        products={bestSellers}
        onQuickView={setQuickViewProduct}
      />

      {bridalPackages.length > 0 && (
        <section className="jj-bridal">
          <div className="jj-bridal-banner">
            <Image src="/hero-banner.png" alt="Elegant bridal setting" fill sizes="100vw" className="jj-bridal-banner-image" />
            <div className="jj-bridal-banner-overlay" />
            <div className="jj-bridal-banner-content">
              <h2>Make Your Special Day Unforgettable</h2>
              <p>Choose from our exclusive bridal packages for a flawless wedding day look.</p>
            </div>
          </div>

          <div className="jj-bridal-header">
            <small>👰 Bridal Packages</small>
            <h2>Choose Your Perfect Package</h2>
          </div>

          <div className="jj-bridal-grid">
            {bridalPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                className={`jj-bridal-card ${pkg.popular ? 'popular' : ''}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                {pkg.popular && <div className="jj-popular-badge">Most Popular</div>}
                <div className="jj-bridal-card-header">
                  <h3>{pkg.title}</h3>
                  <p className="jj-bridal-price">
                    ₦{pkg.price.toLocaleString()}
                  </p>
                </div>
                <p className="jj-bridal-desc">{pkg.description || ''}</p>
                <ul className="jj-bridal-features">
                  {pkg.features.map((feature, i) => (
                    <li key={i}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/bridal?package=${encodeURIComponent(pkg.title || pkg.name || '')}`}
                  className="jj-btn jj-btn-book"
                >
                  Book {(pkg.title || pkg.name || 'Bridal').split(' ')[0]} Package
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="jj-bridal-extras">
            <div className="jj-bridal-extras-links">
              <Link href="/bridal">
                <h3>Compare All Packages</h3>
                <p>See a full feature comparison</p>
                <ArrowRight />
              </Link>
              <Link href="/gallery">
                <h3>Before & After Gallery</h3>
                <p>See our bridal transformations</p>
                <ArrowRight />
              </Link>
            </div>
            <div className="jj-bridal-testimonial">
              <blockquote>
                &ldquo;JayLuxe made me feel like a queen on my wedding day. The attention to detail was incredible!&rdquo;
              </blockquote>
              <cite>– Chioma A.</cite>
            </div>
          </div>

        </section>
      )}

      {transformations.length > 0 && (
        <section className="jj-transformations">
          <div className="jj-section-header">
            <div>
              <small>✨ BEFORE & AFTER</small>
              <h2>Real Customer Transformations</h2>
            </div>
            <Link href="/gallery" className="jj-view-all-dark">
              View Full Gallery <ArrowRight size={16} />
            </Link>
          </div>

          <div className="jj-transformations-grid">
            {transformations.map((t, index) => (
              <motion.div
                key={t.id}
                className="jj-transformation-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <div className="jj-transformation-slider">
                  <ReactCompareSlider
                    itemOne={<ReactCompareSliderImage src={t.beforeImage} alt="Before" style={{ objectFit: 'cover' }} />}
                    itemTwo={<ReactCompareSliderImage src={t.afterImage} alt="After" style={{ objectFit: 'cover' }} />}
                  />
                  <div className="jj-image-label before">Before</div>
                  <div className="jj-image-label after">After</div>
                </div>
                <div className="jj-transformation-content">
                  <span className="jj-transformation-category">{t.category}</span>
                  <h3>{t.title}</h3>
                  {t.description && <p>{t.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="jj-testimonials">
          <div className="jj-section-header">
            <div>
              <small>💬 Testimonials</small>
              <h2>What Our Customers Say</h2>
            </div>
          </div>
          <div className="jj-testimonials-grid">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.id}
                className="jj-testimonial-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <div className="jj-testimonial-rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`star-icon ${i < t.rating ? 'filled' : ''}`}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <blockquote>&quot;{t.testimonial}&quot;</blockquote>
                <div className="jj-testimonial-customer">
                  <Image
                    src={getSafeImageSource(t.image, '/jayluxe-logo.png')}
                    alt={t.customerName}
                    width={48}
                    height={48}
                  />
                  <div>
                    <strong>{t.customerName}</strong>
                    <span>Verified Customer</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section className="jj-services">
        <div>
          <small>Professional Services</small>
          <h2>Beauty Services Made for Every Occasion</h2>
          <p>
            Book professional hair styling, makeup, gele styling, beauty consultation,
            bridal beauty services and special occasion styling.
          </p>

          <Link href="/services" className="jj-btn jj-btn-gold">
            Explore Services <Scissors size={18} />
          </Link>
        </div>
      </section>

      <section className="jj-contact">
        <h2>Need help with an order or service booking?</h2>
        <p>Contact JayLuxe customer service for orders, delivery, products and bookings.</p>

        <div className="jj-contact-grid">
          <a href={OFFICIAL_EMAIL_LINK}>
            <Mail aria-hidden="true" />
            <span>{OFFICIAL_EMAIL}</span>
          </a>

          <a
            href={OFFICIAL_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle aria-hidden="true" />
            <span>WhatsApp: {OFFICIAL_WHATSAPP_DISPLAY}</span>
          </a>
        </div>

        <a
          href={OFFICIAL_WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="jj-whatsapp"
        >
          <MessageCircle aria-hidden="true" />
          Chat on WhatsApp
        </a>
      </section>

      <Footer />
    </main>
  );
}