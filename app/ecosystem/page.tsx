import Link from 'next/link';
import { publicDb } from '@/lib/supabase';
import { approvedResources } from '@/lib/regional-sources';
import { tenant } from '@/lib/tenant-config';
import styles from '../partnerships/partnerships.module.css';
export const dynamic='force-dynamic';
export default async function Explore(){
 const [orgs,resources]=await Promise.all([publicDb().from('organizations').select('id,name,description').eq('status','published').eq('verification_status','verified').order('name'),approvedResources().catch(()=>null)]);
 return <main className={styles.workspace}><Link href="/">Come Home KC</Link><h1>Explore Kansas City</h1><p><a href="https://socialbalances.com/back2kc">Explore a return with Back2KC</a> · <a href={tenant.communityUrl}>Get connected with New2KC</a> · <Link href="/partnerships">Your workspace</Link></p>
 <h2>Employers, stories and opportunities</h2>{orgs.error&&<p>Employer directory unavailable.</p>}{orgs.data?.map(o=><section key={o.id}><h3><Link href={'/employers/'+o.id}>{o.name}</Link></h3><p>{o.description}</p></section>)}
 <h2>Jessica’s List</h2>{resources===null?<p>The directory could not be reached.</p>:resources.length?resources.map(r=><p key={r.id}>{r.name} · {r.company} · {r.area} {r.website?.startsWith('https://')&&<a href={r.website}>Visit resource</a>}</p>):<p>There are currently no published recommendations.</p>}<a href="https://jessicas-list.mary473407.chatgpt.site">Open Jessica’s List</a></main>;
}
