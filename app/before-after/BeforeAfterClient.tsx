'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { Transformation } from '@/lib/types';

export default function BeforeAfterClient({items, categories}:{items:Transformation[];categories:{id:string;name:string}[]}) {
 const [active,setActive]=useState('All');
 const [selected,setSelected]=useState<Transformation|null>(null);
 const filtered=useMemo(()=>active==='All'?items:items.filter(i=>i.category===active),[active,items]);
 return <>
  <section className="jl-ba-filters">{['All',...categories.map(c=>c.name)].map(c=><button key={c} onClick={()=>setActive(c)} className={active===c?'active':''}>{c}</button>)}</section>
  <section className="jl-ba-grid">{filtered.length?filtered.map(item=><article className="jl-ba-card" key={item.id} onClick={()=>setSelected(item)}>
    <div className="jl-ba-images"><div className="jl-ba-half"><Image src={item.beforeImage} alt="Before" fill className="jl-ba-image"/><span>BEFORE</span></div><div className="jl-ba-half"><Image src={item.afterImage} alt="After" fill className="jl-ba-image"/><span>AFTER</span></div></div>
    <div className="jl-ba-content"><p>{item.category}</p><h3>{item.title}</h3><div>{item.description}</div></div>
  </article>):<p>No transformations available yet.</p>}</section>
  {selected&&<div className="jl-ba-modal" onClick={()=>setSelected(null)}><div className="jl-ba-modal-card" onClick={e=>e.stopPropagation()}><button onClick={()=>setSelected(null)}>×</button><div className="jl-ba-modal-images"><Image src={selected.beforeImage} alt="Before" fill/><Image src={selected.afterImage} alt="After" fill/></div><h2>{selected.title}</h2><p>{selected.description}</p></div></div>}
 </>
}
