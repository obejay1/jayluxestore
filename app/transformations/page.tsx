'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTransformations, getTransformationCategories } from '@/lib/transformations';
import type { Transformation } from '@/lib/types';

export default function TransformationsPage() {
  const [items, setItems] = useState<Transformation[]>([]);
  const [categories, setCategories] = useState<{id:string;name:string}[]>([]);
  const [active, setActive] = useState('All');

  useEffect(() => {
    Promise.all([getTransformations(), getTransformationCategories()])
      .then(([t,c]) => { setItems(t.filter((x)=>x.published !== false)); setCategories(c); });
  }, []);

  const filtered = useMemo(
    () => active === 'All' ? items : items.filter((x)=>x.category === active),
    [items, active]
  );

  return (
    <main className="min-h-screen bg-[#faf7f0] px-5 py-12 text-black">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Before & After Transformations</h1>
        <p className="mt-2 text-neutral-600">See the transformation. Experience the difference.</p>
        <div className="my-8 flex flex-wrap gap-2">
          {['All', ...categories.map(c=>c.name)].map(c=>(
            <button key={c} onClick={()=>setActive(c)} className={`rounded-full border px-4 py-2 ${active===c?'bg-black text-white':'bg-white'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {filtered.map(t=>(
            <article key={t.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <img src={t.beforeImage} className="h-48 w-full rounded-xl object-cover" />
                <img src={t.afterImage} className="h-48 w-full rounded-xl object-cover" />
              </div>
              <h2 className="mt-4 font-semibold">{t.title}</h2>
              <p className="text-sm text-neutral-500">{t.category}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
