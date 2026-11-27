import Image from 'next/image';
import type { ReactNode } from 'react';
import SiteHeader from './site-header';
import '@/app/partners/fonts.css';
import '@/app/partners/partners.css';
import '@/app/connected.css';

export function EditorialPage({children}:{children:ReactNode}){
 return <><a className="skip-link" href="#content">Skip to content</a><SiteHeader active="ecosystem"/><main id="content" className="partner-redesign connected"><div className="partner-container">{children}</div></main></>;
}
export function RegionalHero({label,title,children}:{label:string;title:string;children:ReactNode}){
 return <section className="partner-hero-new"><div className="partner-hero-text"><p className="partner-eyebrow">{label}</p><h1>{title}</h1>{children}</div><figure><div className="partner-photo"><Image src="/brand/kansas-city-skyline.jpg" width={900} height={720} alt="Downtown Kansas City skyline" priority unoptimized/></div><figcaption>Kansas City, Missouri</figcaption></figure></section>;
}
