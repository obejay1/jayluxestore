import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';

type EditorialSection = {
  title: string;
  content: ReactNode;
};

type EditorialPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: EditorialSection[];
  updated?: string;
};

export default function EditorialPage({
  eyebrow,
  title,
  introduction,
  sections,
  updated,
}: EditorialPageProps) {
  return (
    <main className="jl-editorial-page jl-policy-page">
      <section className="jl-policy-hero" aria-labelledby="policy-title">
        <PageHeroIcon icon={FileText} label={`${title} page`} />
        <span className="jl-policy-eyebrow">
          <Sparkles size={15} aria-hidden="true" /> {eyebrow}
        </span>
        <h1 id="policy-title" className="font-serif">{title}</h1>
        <p>{introduction}</p>
        {updated && <small>Last updated: {updated}</small>}
      </section>

      <div className="jl-policy-layout">
        <nav className="jl-policy-nav" aria-label={`${title} sections`}>
          <strong>On this page</strong>
          {sections.map((section, index) => (
            <a key={section.title} href={`#policy-section-${index + 1}`}>
              {section.title}
            </a>
          ))}
        </nav>

        <div className="jl-policy-content">
          {sections.map((section, index) => (
            <section key={section.title} id={`policy-section-${index + 1}`}>
              <h2>{section.title}</h2>
              <div>{section.content}</div>
            </section>
          ))}

          <aside className="jl-policy-help">
            <h2>Need help?</h2>
            <p>Contact the JayLuxe team for support with an order, booking or account.</p>
            <Link href="/contact">
              Contact Client Care <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>

      <Footer />
    </main>
  );
}
