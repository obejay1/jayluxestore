import { getTransformations, getTransformationCategories } from '@/lib/transformations';
import BeforeAfterClient from './BeforeAfterClient';

export const dynamic = 'force-dynamic';

export default async function BeforeAfterPage() {
  const [items, categories] = await Promise.all([
    getTransformations().catch(() => []),
    getTransformationCategories().catch(() => []),
  ]);

  const published = items.filter((item) => item.published !== false);

  return (
    <main className="jl-ba-page">
      <section className="jl-ba-hero">
        <span>JAYLUXE TRANSFORMATIONS</span>
        <h1>Before & After</h1>
        <p>Discover real beauty transformations created by JayLuxe professionals.</p>
      </section>

      <BeforeAfterClient items={published} categories={categories} />

      <style>{`
        .jl-ba-page{background:#faf6ef;color:#17120d;padding-bottom:80px}
        .jl-ba-hero{text-align:center;padding:90px 20px 45px}
        .jl-ba-hero span{letter-spacing:.28em;color:#b8862f;font-size:12px}
        .jl-ba-hero h1{font-size:clamp(42px,6vw,72px);font-weight:500;margin:20px 0 12px}
        .jl-ba-hero p{max-width:600px;margin:auto;color:#655b51}
        .jl-ba-filters{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;padding:20px}
        .jl-ba-filters button{border:1px solid #d8c6a0;background:white;border-radius:999px;padding:10px 20px;color:#17120d}
        .jl-ba-filters .active{background:#17120d;color:white}
        .jl-ba-grid{max-width:1200px;margin:35px auto;padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
        .jl-ba-card{background:white;cursor:pointer;border-radius:20px;overflow:hidden;box-shadow:0 15px 40px rgba(0,0,0,.08)}
        .jl-ba-images{display:grid;grid-template-columns:1fr 1fr;aspect-ratio:1/1.15;position:relative}
        .jl-ba-half{position:relative;overflow:hidden}
        .jl-ba-image{object-fit:cover}
        .jl-ba-half span{position:absolute;top:15px;left:15px;background:rgba(0,0,0,.55);color:white;padding:6px 10px;font-size:11px;letter-spacing:.15em}
        .jl-ba-half+ .jl-ba-half span{left:auto;right:15px}
        .jl-ba-content{padding:24px}
        .jl-ba-content p{color:#b8862f;text-transform:uppercase;font-size:12px;letter-spacing:.1em}
        .jl-ba-content h3{font-size:24px;margin:10px 0}
        .jl-ba-content div{color:#6b625a;line-height:1.7}
        @media(max-width:900px){.jl-ba-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.jl-ba-grid{grid-template-columns:1fr}.jl-ba-hero{padding-top:60px}}
        .jl-ba-modal{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px}
        .jl-ba-modal-card{background:#fff;max-width:800px;width:100%;padding:25px;border-radius:24px;position:relative}
        .jl-ba-modal-card button{position:absolute;right:20px;top:15px;font-size:30px;background:none;border:0;z-index:2}
        .jl-ba-modal-images{height:420px;display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative;overflow:hidden;border-radius:18px}
        .jl-ba-modal-images img{object-fit:cover}
        
      `}</style>
    </main>
  );
}
