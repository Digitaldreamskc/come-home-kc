"use client";
import Link from 'next/link';
import {useOpenDemo} from './open-demo/link';
import {BrandIdentity} from './tenant-ui';
import {tenant,type TenantConfig} from '@/lib/tenant-config';
export default function SiteHeader({config=tenant,active}:{config?:TenantConfig;active?:'home'|'partners'|'ecosystem'}){
 const demo=useOpenDemo(),home=demo?'/demo':'/',partners=demo?'/demo/partners':'/partners';
 const links=<><Link href={home} aria-current={active==='home'?'page':undefined}>Marketplace</Link><Link href="/ecosystem" aria-current={active==='ecosystem'?'page':undefined}>Explore KC</Link><Link href={partners} aria-current={active==='partners'?'page':undefined}>Founding partners</Link>{demo?<Link href="/demo/paths">Get connected</Link>:<a href={config.communityUrl} target="_blank" rel="noopener noreferrer">Get connected<span className="sr-only"> (opens in a new tab)</span></a>}<Link href={demo?'/demo/kcnow':'/partnerships'} className="button button-outline small">{demo?'KC Now concept':'My workspace'}</Link></>;
 return <header className="site-header"><div className="header-inner"><BrandIdentity config={config} homeHref={home}/><details className="mobile-menu" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}><summary>Menu</summary><nav aria-label="Mobile navigation" onClick={e=>{if((e.target as HTMLElement).closest('a'))e.currentTarget.closest('details')?.removeAttribute('open');}}>{links}</nav></details><nav aria-label="Main navigation">{links}</nav></div></header>;
}
