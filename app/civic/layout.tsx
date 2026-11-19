import Link from 'next/link';

import {CivicNavigation,CivicSignOut} from '@/components/platform/navigation';
import {openDemoReady} from '@/lib/open-demo-access';
import {civicSession} from '@/lib/platform/session';
import {civic} from '@/lib/platform/config';

import {designTokens} from '@/lib/tenant-config';

import './civic.css';

export const metadata={title:'KC Now | Civic leadership concept',description:civic.description};

export default async function CivicLayout({children}:{children:React.ReactNode}){const user=openDemoReady(process.env)?null:(await civicSession()).user;return <div className="civic" style={designTokens(civic)}><Link className="civic-skip" href="#civic-content">Skip to content</Link><div className="civic-concept">CONCEPT DEMONSTRATION · Fictional people & opportunities · No approved partnership</div><header className="civic-header"><Link href="/civic" className="civic-brand">KC Now<span>CIVIC LEADERSHIP</span></Link><p>Educate. Connect. Activate.</p>{user?<CivicSignOut/>:<Link href="/civic/login">Sign in</Link>}</header><details className="civic-mobile-nav"><summary>Explore your civic workspace</summary><CivicNavigation mobile/></details><div className="civic-frame"><CivicNavigation/><main id="civic-content" className="civic-content">{children}</main></div><footer className="civic-footer">A proposed civic leadership experience. Private profiles. Permissioned introductions. Human review.<br/>No messages, invitations, applications, or public placements are sent from this demonstration.</footer></div>;}

// Skip static prerender. Without civic database env, civicSession throws before cookies(), and Next would fail the build on /civic/login.
export const dynamic='force-dynamic';
