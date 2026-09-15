'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Transformation } from '@/lib/types';

export default function BeforeAfterClient({items, categories}:{items:Transformation[];categories:{id:string;name:string}[]}) {
  const [active,setActive]=useState('All');
  const [viewer,setViewer]=useState<{item:Transformation; side:'before'|'after'}|null>(null);

  const filtered=useMemo(
    ()=>active==='All'?items:items.filter(i=>i.category===active),
    [active,items]
  );

  useEffect(()=>{
    const close=(e:KeyboardEvent)=>{
      if(e.key==='Escape') setViewer(null);
    };
    window.addEventListener('keydown',close);
    document.body.style.overflow = viewer ? 'hidden' : '';
    return ()=>{
      window.removeEventListener('keydown',close);
      document.body.style.overflow='';
    };
  },[viewer]);

  return <>
    <section className="jl-ba-filters">
      {['All',...categories.map(c=>c.name)].map(c=>
        <button key={c} onClick={()=>setActive(c)} className={active===c?'active':''}>{c}</button>
      )}
    </section>

    <section className="jl-ba-grid">
      {filtered.length ? filtered.map(item=>
        <article className="jl-ba-card" key={item.id}>
          <div className="jl-ba-images">
            <button className="jl-ba-half" onClick={()=>setViewer({item,side:'before'})}>
              <Image src={item.beforeImage} alt={`${item.title} before`} fill sizes="(max-width:768px) 100vw, 50vw" className="jl-ba-image"/>
              <span>BEFORE</span>
            </button>
            <button className="jl-ba-half" onClick={()=>setViewer({item,side:'after'})}>
              <Image src={item.afterImage} alt={`${item.title} after`} fill sizes="(max-width:768px) 100vw, 50vw" className="jl-ba-image"/>
              <span>AFTER</span>
            </button>
          </div>
          <div className="jl-ba-content">
            {item.category && <p>{item.category}</p>}
            <h3>{item.title}</h3>
            {item.description && <div>{item.description}</div>}
          </div>
        </article>
      ):<p>No transformations available yet.</p>}
    </section>

    {viewer && (
      <div className="jl-ba-viewer" onClick={()=>setViewer(null)}>
        <button className="jl-ba-viewer-close" onClick={()=>setViewer(null)} aria-label="Close">×</button>
        <div className="jl-ba-viewer-content" onClick={e=>e.stopPropagation()}>
          <Image
            src={viewer.side==='before'?viewer.item.beforeImage:viewer.item.afterImage}
            alt={viewer.side}
            fill
            sizes="100vw"
            className="object-contain"
          />
          <span>{viewer.side.toUpperCase()}</span>
        </div>
      </div>
    )}
  </>;
}
