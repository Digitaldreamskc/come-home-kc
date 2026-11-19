"use client";
import {useState} from 'react';
import Link from 'next/link';
import {DemoContext} from './link';
import {Marketplace} from '@/components/marketplace';
import PrivateProfile from '@/components/private-profile';
import FoundingPartner from '@/components/founding-partner';
import Program from '@/components/platform/program';
import PathWorkspace from '@/components/paths/path-workspace';
import {tenant,designTokens} from '@/lib/tenant-config';
import {civic,civicProgram} from '@/lib/platform/config';
import {demoCatalog} from '@/lib/demo-catalog';
import {demoProgram,updateDemoProgram} from '@/lib/open-demo-program';
export default function OpenDemo({section}:{section:string}){
 const [profile,setProfile]=useState<Record<string,unknown>>({name:'Alex Morgan'}),[data,setData]=useState(demoProgram);
 const kc=section.startsWith('kcnow'),part=section.split('/')[1]||'home',back2kc=!section||section==='back2kc';
 return <DemoContext value={true}><div className="open-demo"><aside className="open-demo-banner"><strong>OPEN SYNTHETIC DEMO</strong><span>No sign-in. Use fictional information only. Changes stay in this page and reset on refresh. Nothing is sent or saved to a database.</span><nav aria-label="Demo sections"><Link aria-current={back2kc?'page':undefined} href="/demo">Back2KC</Link><Link aria-current={section==='profile'?'page':undefined} href="/demo/profile">Profile</Link><Link aria-current={section==='partners'||section==='employer'?'page':undefined} href="/demo/partners">Founding partner</Link><Link aria-current={section==='paths'?'page':undefined} href="/demo/paths">Introductions</Link><Link aria-current={kc?'page':undefined} href="/demo/kcnow">KC Now</Link></nav></aside>
 {back2kc?<Marketplace config={tenant} demonstration={demoCatalog(tenant)}/>
 :section==='paths'?<PathWorkspace config={tenant} browserOnly/>
 :section==='profile'?<main className="open-demo-form"><nav><Link href="/demo">← Marketplace</Link><Link href="/demo/profile">Private profile</Link><Link href="/demo/partners">Founding partner</Link><Link href="/demo/paths">Find your path</Link></nav><PrivateProfile profile={profile} busy={false} onSave={async p=>{setProfile(p.data as Record<string,unknown>);return true;}}/></main>
 :section==='partners'||section==='employer'?<FoundingPartner layout="page"/>
 :kc?<div className="civic" style={designTokens(civic)}><header className="civic-header"><Link className="civic-brand" href="/demo/kcnow">KC Now<span>CIVIC LEADERSHIP CONCEPT</span></Link></header><nav className="open-demo-civic-nav" aria-label="Civic navigation">{civicProgram.navigation.filter(([key])=>!['organization','review'].includes(key)).map(([key,label])=><Link aria-current={part===key?'page':undefined} key={key} href={'/demo/kcnow/'+key}>{label}</Link>)}</nav><main className="civic-content">{part==='connections'?<PathWorkspace config={civic} browserOnly/>:<Program key={part} section={part} initial={data} onDemoSave={async command=>{const next=updateDemoProgram(data,command);setData(next);return next;}}/>}</main></div>
 :<main className="open-demo-home"><h1>That demo page is not available</h1><p>Private accounts, administration, and API routes are not part of this site.</p><Link className="button primary" href="/demo">Back to Back2KC</Link></main>}</div></DemoContext>;
}
