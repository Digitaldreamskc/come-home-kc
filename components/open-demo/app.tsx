"use client";
import {useState} from 'react';
import Link from 'next/link';
import {DemoContext} from './link';
import {Marketplace} from '@/components/marketplace';
import PrivateProfile from '@/components/private-profile';
import EmployerRegistration from '@/components/employer-registration';
import Program from '@/components/platform/program';
import PathWorkspace from '@/components/paths/path-workspace';
import {tenant,designTokens} from '@/lib/tenant-config';
import {civic,civicProgram} from '@/lib/platform/config';
import {demoCatalog} from '@/lib/demo-catalog';
import {demoProgram,updateDemoProgram} from '@/lib/open-demo-program';
export default function OpenDemo({section}:{section:string}){
 const [profile,setProfile]=useState<Record<string,unknown>>({name:'Alex Morgan'}),[submission,setSubmission]=useState<Record<string,unknown>>(),[data,setData]=useState(demoProgram);
 const kc=section.startsWith('kcnow'),part=section.split('/')[1]||'home';
 return <DemoContext value={true}><aside className="open-demo-banner"><strong>OPEN SYNTHETIC DEMO</strong><span>No sign-in. Use fictional information only. Changes stay in this page and reset on refresh or navigation. Nothing is sent or saved to a database.</span><Link href="/demo">Choose experience</Link></aside>
 {!section?<main className="open-demo-home"><p className="eyebrow">EXPLORE THE EXPERIENCE</p><h1>People. Permission. Possibility.</h1><p>Try Back2KC’s talent marketplace and the separate KC Now civic leadership concept. Every person, role and relationship here is fictional.</p><div className="open-demo-grid"><section><h2>Back2KC</h2><p>Explore opportunities, a private profile, employer onboarding and human-reviewed introductions.</p><Link className="button primary" href="/demo/back2kc">Explore Back2KC →</Link><Link href="/demo/paths">Try an introduction →</Link></section><section><h2>KC Now · concept</h2><p>Explore civic learning, leadership opportunities and permission-based connections. No approved partnership.</p><Link className="button primary" href="/demo/kcnow">Explore KC Now →</Link></section></div><p>Role switching demonstrates the consent flow; it does not grant access to any real account. Private application and administrative routes are unavailable on this site.</p></main>
 :section==='back2kc'?<Marketplace config={tenant} demonstration={demoCatalog(tenant)}/>
 :section==='paths'?<PathWorkspace config={tenant} browserOnly/>
 :section==='profile'||section==='employer'?<main className="open-demo-form"><nav><Link href="/demo/back2kc">← Marketplace</Link><Link href="/demo/profile">Private profile</Link><Link href="/demo/employer">Employer registration</Link><Link href="/demo/paths">Find your path</Link></nav>{section==='profile'?<PrivateProfile profile={profile} busy={false} onSave={async p=>{setProfile(p.data as Record<string,unknown>);return true;}}/>:<EmployerRegistration submission={submission} busy={false} onSave={async()=>{setSubmission({status:'pending'});return true;}}/>}</main>
 :kc?<div className="civic" style={designTokens(civic)}><header className="civic-header"><Link className="civic-brand" href="/demo/kcnow">KC Now<span>CIVIC LEADERSHIP CONCEPT</span></Link></header><nav className="open-demo-civic-nav" aria-label="Civic navigation">{civicProgram.navigation.filter(([key])=>!['organization','review'].includes(key)).map(([key,label])=><Link aria-current={part===key?'page':undefined} key={key} href={'/demo/kcnow/'+key}>{label}</Link>)}</nav><main className="civic-content">{part==='connections'?<PathWorkspace config={civic} browserOnly/>:<Program key={part} section={part} initial={data} onDemoSave={async command=>{const next=updateDemoProgram(data,command);setData(next);return next;}}/>}</main></div>
 :<main className="open-demo-home"><h1>Choose a demo experience</h1><Link href="/demo">Back to demo home</Link></main>}</DemoContext>;
}
