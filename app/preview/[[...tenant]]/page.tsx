import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Marketplace } from '@/components/marketplace';
import { demoCatalog } from '@/lib/demo-catalog';
import { designTokens, getTenant } from '@/lib/tenant-config';
export const dynamic='force-dynamic';
export default async function Preview({params}:{params:Promise<{tenant?:string[]}>}){
 const host=(await headers()).get('host')?.split(':')[0];
 if(process.env.ENABLE_LOCAL_DEMO!=='1'||!['localhost','127.0.0.1','[::1]'].includes(host||''))notFound();
 const key=(await params).tenant?.[0]||'back2kc';if(!['back2kc','synthetic'].includes(key))notFound();
 const config=getTenant(key);
 return <div className="tenant-surface" style={designTokens(config) as React.CSSProperties}><div className="demo-notice" role="note">LOCAL DEMONSTRATION · All listings and employers below are synthetic. No applications or introductions are sent.</div><Marketplace config={config} demonstration={demoCatalog(config)}/></div>;
}
