'use client';

import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import ResponsiveImage from '@/components/ResponsiveImage';
import { getTestimonials, Testimonial } from '@/lib/testimonials';

const fallback: Testimonial[] = [
  { id: '1', customerName: 'Chioma A.', rating: 5, review: 'JayLuxe made my bridal experience feel effortless and beautiful. The attention to detail was exceptional.', testimonial: 'JayLuxe made my bridal experience feel effortless and beautiful. The attention to detail was exceptional.', productOrService: 'Bridal Beauty', createdAt: new Date().toISOString(), featured: true },
  { id: '2', customerName: 'Tolu M.', rating: 5, review: 'The product quality and presentation were premium, and the customer support was warm and responsive.', testimonial: 'The product quality and presentation were premium, and the customer support was warm and responsive.', productOrService: 'Beauty Collection', createdAt: new Date().toISOString(), featured: true },
  { id: '3', customerName: 'Amaka N.', rating: 5, review: 'Everything arrived beautifully packaged. I loved how easy it was to order and follow up.', testimonial: 'Everything arrived beautifully packaged. I loved how easy it was to order and follow up.', productOrService: 'Fashion & Lifestyle', createdAt: new Date().toISOString(), featured: true },
];

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>(fallback);

  useEffect(() => {
    getTestimonials().then((data) => data.length && setItems(data)).catch(() => setItems(fallback));
  }, []);

  return (
    <main className="jl-editorial-page jl-testimonials-page">
      <section className="jl-editorial-hero">
        <PageHeroIcon icon={Quote} label="Customer testimonials" />
        <span>Client Stories</span>
        <h1 className="font-serif">Loved by the JayLuxe community.</h1>
        <p>Real experiences from customers who shop, celebrate and transform with JayLuxe.</p>
      </section>

      <section className="jl-testimonial-page-grid">
        {items.map((item) => (
          <article key={item.id} className="jl-testimonial-page-card">
            <div className="jl-testimonial-page-top">
              <Quote size={22} aria-hidden="true" />
              <div className="jl-testimonial-stars" aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={15} fill={index < item.rating ? 'currentColor' : 'none'} />)}</div>
            </div>
            <blockquote>“{item.testimonial || item.review}”</blockquote>
            <footer>
              <ResponsiveImage src={item.image} fallbackSrc="/jayluxe-logo.png" alt={item.customerName} width={44} height={44} />
              <span><strong>{item.customerName}</strong><small>{item.productOrService || 'Verified JayLuxe Customer'}</small></span>
            </footer>
          </article>
        ))}
      </section>
      <Footer />
    </main>
  );
}
