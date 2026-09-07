'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import {
  ArrowRight,
  Truck,
  Package,
  Phone,
  Zap,
  TrendingUp,
  Gift,
  Gem,
  Scissors,
  Images,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { getResponsiveDeliverySource, getSafeImageSource } from '@/lib/images';
import {
  CATEGORY_GRID_CLASSES,
  PRODUCT_GRID_CLASSES,
  PRODUCT_SECTION_SHELL_CLASS,
} from '@/lib/layoutClasses';
import { getProducts, getCategories } from '@/lib/store';
import { getTestimonials, Testimonial } from '@/lib/testimonials';
import { Product, Category, BridalPackage, Transformation } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import ResponsiveImage from '@/components/ResponsiveImage';
import QuickViewModal from '@/components/QuickViewModal';
import Footer from '@/components/Footer';
import { getBridalPackages } from '@/lib/bridal';
import { getFeaturedTransformations } from '@/lib/transformations';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_EMAIL_LINK,
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
    <section className={`jj-products jj-product-showcase jl-home-product-showcase jl-home-tight-section ${PRODUCT_SECTION_SHELL_CLASS}`} id={id}>
      <div className="jj-section-header">
        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
        </div>
        <Link href={href}>
          View All <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className={`jj-product-grid ${PRODUCT_GRID_CLASSES} jl-home-product-grid`}>
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
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
  const editorialServiceImage = products.find(
    (product) => product.type === 'service' && product.active !== false && product.image,
  )?.image;
  const editorialBridalImage = bridalPackages.find((item) => item.image)?.image;
  const editorialGalleryImage = transformations.find(
    (item) => item.afterImage || item.beforeImage,
  );
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          <div className="jj-badge">
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

      <section className="jj-trust" aria-label="JayLuxe service promises">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.38 }}
        >
          <span className="jl-trust-icon jl-trust-icon-delivery" aria-hidden="true"><Truck /></span>
          <h3>Fast Delivery</h3>
          <p>Across Nigeria</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.38, delay: 0.06 }}
        >
          <span className="jl-trust-icon jl-trust-icon-quality" aria-hidden="true"><Package /></span>
          <h3>Quality Products</h3>
          <p>Trusted & reliable</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.38, delay: 0.12 }}
        >
          <span className="jl-trust-icon jl-trust-icon-support" aria-hidden="true"><Phone /></span>
          <h3>Customer Support</h3>
          <p>We are here for you</p>
        </motion.div>
      </section>


      <section className={`jj-home-promotions jl-home-tight-section ${PRODUCT_SECTION_SHELL_CLASS}`} aria-labelledby="home-promotions-title">
        <div className="jj-section-header">
          <div>
            <small>Current edits</small>
            <h2 id="home-promotions-title">Promotions &amp; Popular Picks</h2>
            <p>Discover what's trending, limited, and worth adding to your wardrobe.</p>
          </div>
          <Link href="/promotions">View All <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="jl-home-promo-features" aria-label="JayLuxe promotional collections">
          <Link href="/flash-sale" className="jl-home-promo-feature jl-home-promo-flash">
            <span className="jl-home-promo-icon" aria-hidden="true"><Zap size={26} strokeWidth={2.1} /></span>
            <span className="jl-home-promo-copy"><strong>Limited Drops</strong><small>Exclusive offers</small></span>
          </Link>
          <Link href="/promotions" className="jl-home-promo-feature jl-home-promo-seasonal">
            <span className="jl-home-promo-icon" aria-hidden="true"><Gift size={26} strokeWidth={2.1} /></span>
            <span className="jl-home-promo-copy"><strong>Seasonal Favourites</strong><small>Curated collections</small></span>
          </Link>
          <Link href="/best-sellers" className="jl-home-promo-feature jl-home-promo-bestselling">
            <span className="jl-home-promo-icon" aria-hidden="true"><TrendingUp size={26} strokeWidth={2.1} /></span>
            <span className="jl-home-promo-copy"><strong>Best Sellers</strong><small>Customer favourites</small></span>
          </Link>
        </div>
      </section>

      <section className={`jj-categories jl-home-category-section jl-home-tight-section ${PRODUCT_SECTION_SHELL_CLASS}`}>
        <div className="jj-section-header jl-category-heading">
          <div>
            <small>Curated Departments</small>
            <h2>Shop by Category</h2>
          </div>
        </div>

        <div className={`jj-category-grid ${CATEGORY_GRID_CLASSES}`}>
          {categories.filter((category) => category.active !== false).slice(0, 4).map((category) => (
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
                <ResponsiveImage
                  src={categoryImage(category)}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  className="jj-category-image-element"
                />
                <span className="jj-category-image-overlay" />
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
        eyebrow="Just Arrived"
        title="New Arrivals"
        href="/new-arrivals"
        products={newArrivals}
        onQuickView={setQuickViewProduct}
      />

      <ProductShowcase
        id="products"
        eyebrow="Curated by JayLuxe"
        title="Featured Products"
        href="/featured-products"
        products={featuredProducts}
        onQuickView={setQuickViewProduct}
      />

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
            <small className="jj-icon-heading"><Gem size={16} aria-hidden="true" /> Bridal Packages</small>
            <h2>Choose Your Perfect Package</h2>
          </div>

          <div className="jj-bridal-grid">
            {bridalPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                className={`jj-bridal-card ${pkg.popular ? 'popular' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
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
                  {pkg.features.slice(0, 4).map((feature, i) => (
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
                  Book Package
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="jj-bridal-extras">
            <div className="jj-bridal-extras-links">
              <Link href="/bridal" className="jj-bridal-compare-cta">
                <h3>Compare all bridal packages</h3>
                <p>See pricing, services and features side by side.</p>
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/gallery" className="jj-bridal-gallery-cta">
                <h3>Before &amp; After Gallery</h3>
                <p>Explore real JayLuxe bridal transformations.</p>
                <ArrowRight aria-hidden="true" />
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
              <small>BEFORE &amp; AFTER</small>
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
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-24px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
              >
                <div className="jj-transformation-slider">
                  <ReactCompareSlider
                    itemOne={<ReactCompareSliderImage src={getResponsiveDeliverySource(t.beforeImage, 960)} alt="Before" style={{ objectFit: 'cover' }} />}
                    itemTwo={<ReactCompareSliderImage src={getResponsiveDeliverySource(t.afterImage, 960)} alt="After" style={{ objectFit: 'cover' }} />}
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
        <section className="jj-testimonials jl-home-tight-section">
          <div className="jj-section-header">
            <div>
              <small>💬 Testimonials</small>
              <h2>What Our Customers Say</h2>
            </div>
          </div>
          <div className="jj-testimonials-grid jl-home-testimonial-carousel">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.id}
                className="jj-testimonial-card"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-24px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
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
                  <ResponsiveImage
                    src={t.image}
                    fallbackSrc="/logo.png"
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


      <section className="jl-story-section">
        <div className="jl-story-card">
          <span>THE JAYLUXE EXPERIENCE</span>
          <h2>Luxury Essentials Crafted For Your Lifestyle</h2>
          <p>
            Discover premium beauty, fashion and lifestyle pieces carefully selected
            to help you look confident and live beautifully every day.
          </p>
          <Link href="/about" className="jj-btn jj-btn-gold">
            Discover JayLuxe <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="jl-why-section">
        <div className="jj-section-header">
          <div>
            <small>Why JayLuxe</small>
            <h2>A Premium Shopping Experience</h2>
          </div>
        </div>
        <div className="jl-benefit-grid">
          <div><Gem /><h3>Premium Selection</h3><p>Curated products chosen for quality and style.</p></div>
          <div><Package /><h3>Secure Shopping</h3><p>Trusted payment options with safe checkout.</p></div>
          <div><Truck /><h3>Reliable Delivery</h3><p>Fast and convenient delivery experience.</p></div>
        </div>
      </section>


      <section className="jj-contact jl-home-help-section">
        <h2>Need help with an order or service booking?</h2>
        <p>Contact JayLuxe customer service for orders, delivery, products and bookings.</p>

        <div className="jj-contact-grid jl-home-help-grid">
          <a href={OFFICIAL_EMAIL_LINK}>
            <Mail aria-hidden="true" />
            <span>{OFFICIAL_EMAIL}</span>
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