'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {civicProgram} from '@/lib/platform/config';
export function CivicNavigation({mobile=false}:{mobile?:boolean}){const path=usePathname();return <nav className={mobile?undefined:'civic-nav'} aria-label={mobile?'Mobile civic navigation':'Civic navigation'}>{civicProgram.navigation.map(([key,label])=>{const href='/civic'+(key==='home'?'':'/'+key);return <Link key={key} href={href} aria-current={path===href?'page':undefined} onClick={e=>{const d=e.currentTarget.closest('details');if(d)d.open=false;}}>{label}</Link>;})}</nav>;}
export function CivicSignOut(){const router=useRouter();return <button className="civic-signout" onClick={async()=>{await fetch('/api/civic/auth',{method:'DELETE'});router.push('/civic/login');router.refresh();}}>Sign out</button>;}
