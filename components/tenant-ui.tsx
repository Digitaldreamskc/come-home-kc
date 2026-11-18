'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { TenantConfig } from '@/lib/tenant-config';

export function BrandIdentity({config}:{config:TenantConfig}) {
 return <Link href="/" className="wordmark" aria-label={config.product+' home'}>{config.logo&&<Image src={config.logo} alt={config.name} width={120} height={96} unoptimized loading="eager"/>}<span className="product-title">{config.product}</span></Link>;
}

/** Native buttons remain reachable by Tab; arrow keys move focus and selection. */
export function RegionSelector({config,value,onChange}:{config:TenantConfig;value:string;onChange:(value:string)=>void}) {
 return <div className="region-switch" role="group" aria-label="Choose region" onKeyDown={e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const options=config.geography;const i=options.findIndex(r=>r.key===value);
  const next=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowRight'?1:-1)+options.length)%options.length;
  onChange(options[next].key);e.currentTarget.querySelectorAll('button')[next]?.focus();
 }}>{config.geography.map(r=><button key={r.key} aria-pressed={value===r.key} className={value===r.key?'selected':''} onClick={()=>onChange(r.key)}>{r.label}</button>)}</div>;
}
