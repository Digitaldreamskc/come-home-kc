"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';
import {useOpenDemo} from './open-demo/link';
import {BrandIdentity} from './tenant-ui';
import {tenant,type TenantConfig} from '@/lib/tenant-config';

export default function SiteHeader({config=tenant}:{config?:TenantConfig}){
  const demo=useOpenDemo(),path=usePathname();
  const menu=useRef<HTMLDetailsElement>(null);
  const home=demo?'/demo':'/';
  const sections=[
    ['Home',home],['Marketplace',demo?'/demo':'/marketplace'],
    ...(config.welcomeFormUrl&&!demo?[[config.communityName,config.communityUrl]]:[]),
    ['Founding partners',demo?'/demo/partners':'/partners'],
    ...(!demo?[['Regional Intelligence','/regional-intelligence'],['Corporate Talent Partners','/corporate-partners']]:[]),
    [demo?'KC Now concept':'My workspace',demo?'/demo/kcnow':'/partnerships']
  ];
  useEffect(()=>{
    function outside(event:PointerEvent){if(menu.current&&!menu.current.contains(event.target as Node))menu.current.open=false;}
    document.addEventListener('pointerdown',outside);
    return ()=>document.removeEventListener('pointerdown',outside);
  },[]);
  return <header className="site-header"><div className="header-inner">
    <BrandIdentity config={config} homeHref={home}/>
    <div className="header-actions"><details className="section-menu" ref={menu} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.open=false;}} onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}>
      <summary>Menu</summary><nav aria-label="Site sections">{sections.map(([name,href])=><Link key={name} href={href} aria-current={path===href?'page':undefined} onClick={()=>{if(menu.current)menu.current.open=false;}}>{name}</Link>)}</nav>
    </details><Link href={demo?'/demo/paths':config.welcomeFormUrl?'/get-connected':config.communityUrl} className="button primary">Get connected</Link></div>
  </div></header>;
}
