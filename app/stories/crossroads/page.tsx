import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isolatedDatabase } from '@/lib/platform/preview-access';
import { publicDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export default async function Story() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== isolatedDatabase) notFound();
  const db = publicDb();
  const id = 'de270000-0000-4000-8000-000000000001';
  const [profile, jobs] = await Promise.all([
    db.from('organizations').select('name,description').eq('id', id).maybeSingle(),
    db.from('job_postings').select('id,title').eq('organization_id', id).order('title'),
  ]);
  if (profile.error || jobs.error) throw Error('Employer discovery unavailable');
  if (!profile.data) notFound();
  return <main className="account-shell">
    <Link href="/">Come Home KC marketplace</Link>
    <p>The Work Happening Here · Fictional employer feature</p>
    <h1>Inside the workbench at Crossroads Instrument Works</h1>
    <p>A sensor that works on a lab bench still has to work on a factory floor. In this fictional Kansas City workshop, engineers build the instrument, operations staff plan its assembly, and field specialists help customers use it.</p>
    <h2>{profile.data.name}</h2><p>{profile.data.description}</p>
    <h2>Explore the work</h2><ul>{jobs.data.map(job=><li key={job.id}><Link href={'/jobs/'+job.id}>{job.title}</Link></li>)}</ul>
  </main>;
}
