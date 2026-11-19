'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { TenantConfig } from '@/lib/tenant-config';

const heart="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 58'%3E%3Cpath fill='%2300aeef' d='M32 56 6 31C-9 16 10-8 27 7l5 5 5-5c17-15 36 9 21 24Z'/%3E%3C/svg%3E";
export function BrandIdentity({config,homeHref='/'}:{config:TenantConfig;homeHref?:string}) {
 if(config.product==='Come Home KC')return <Link href={homeHref} className="wordmark wordmark-heart" aria-label="Come Home KC home"><span className="wordmark-line">COME HOME <span className="wordmark-kc" style={{backgroundImage:`url("${heart}")`}}>KC</span></span><small>BY BACK2KC + NEW2KC</small></Link>;
 return <Link href={homeHref} className="wordmark" aria-label={config.product+' home'}>{config.logo&&<Image src={config.logo} alt={config.name} width={120} height={96} unoptimized loading="eager"/>}<span className="product-title">{config.product}</span></Link>;
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
