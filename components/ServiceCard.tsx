'use client';

import { ArrowRight } from 'lucide-react';

import ResponsiveImage from '@/components/ResponsiveImage';
import type { Product } from '@/lib/types';

type ServiceCardProps = {
  service: Product;
  onBook: (service: Product) => void;
  featured?: boolean;
};

function money(amount?: number) {
  return `₦${Math.round(Number(amount || 0)).toLocaleString('en-NG')}`;
}

export default function ServiceCard({
  service,
  onBook,
  featured = false,
}: ServiceCardProps) {
  return (
    <article className="jl-unified-service-card jl-service-card-compact">
      <div className="jl-unified-service-media">
        <ResponsiveImage
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
        />

        <span className="jl-unified-service-category">
          {service.category || 'Beauty Service'}
        </span>

        {featured ? (
          <span className="jl-unified-service-featured">
            Featured
          </span>
        ) : null}
      </div>

      <div className="jl-unified-service-body">
        <h3>{service.name}</h3>
        <p>
          {service.description ||
            'A premium JayLuxe beauty and lifestyle service tailored to your occasion.'}
        </p>

        <div className="jl-unified-service-price">
          <span>Starting at</span>
          <strong>{money(service.price)}</strong>
        </div>

        <button type="button" onClick={() => onBook(service)}>
          Book Now
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
