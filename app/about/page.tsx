import Link from 'next/link';
import { ArrowRight, Heart, Shield, Sparkles, Truck } from 'lucide-react';
import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';

export default function AboutPage() {
  return (
    <main className="jl-editorial-page jl-about-page">
      <section className="jl-editorial-hero jl-about-hero">
        <PageHeroIcon icon={Heart} label="About JayLuxe" />
        <span><Sparkles size={16} /> The JayLuxe Story</span>
        <h1 className="font-serif">Luxury that feels personal.</h1>
        <p>JayLuxe brings fashion, beauty, hair, bridal and lifestyle essentials together in one refined Nigerian shopping experience.</p>
      </section>

      <section className="jl-about-story">
        <div>
          <p className="jl-section-kicker">Our Purpose</p>
          <h2 className="font-serif">Helping every customer look good, feel confident and shop with trust.</h2>
        </div>
        <div>
          <p>We believe luxury is not simply about price. It is the feeling created by thoughtful service, quality presentation, authentic products and attention to every detail.</p>
          <p>From everyday beauty essentials to bridal transformations and carefully selected lifestyle pieces, JayLuxe is designed to make premium shopping feel warm, reliable and effortless.</p>
        </div>
      </section>

      <section className="jl-values-grid">
        <article><Shield size={25} /><h3>Trusted Quality</h3><p>Products and services are selected with care, authenticity and customer confidence in mind.</p></article>
        <article><Heart size={25} /><h3>Personal Service</h3><p>Every order, booking and enquiry receives thoughtful attention from the JayLuxe team.</p></article>
        <article><Truck size={25} /><h3>Reliable Experience</h3><p>Clear ordering, delivery updates and responsive support make the journey feel effortless.</p></article>
      </section>

      <section className="jl-editorial-cta">
        <p>Discover your next JayLuxe favourite.</p>
        <h2 className="font-serif">A refined collection, chosen for you.</h2>
        <div><Link href="/shop">Shop Collection <ArrowRight size={17} /></Link><Link href="/services">Explore Services</Link></div>
      </section>
      <Footer />
    </main>
  );
}
