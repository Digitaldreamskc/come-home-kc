import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import SiteHeader from '@/components/site-header';
import { session } from '@/lib/supabase';
import type { ApplicationInput } from '@/lib/ecosystem-application-schema';
import '@/app/connected.css';

const path = '/admin/ecosystem-applications';
type Application = {
  id: string; name: string; status: string; submittedAt: string; providerId: string | null;
  application?: ApplicationInput; logo?: string;
  candidates?: { id: string; name: string; website: string; status: string }[];
  decisions?: { id: number; decision: string; notes: string; reviewed_at: string; reviewer_id: string; identity_decision: string | null }[];
};

async function review(form: FormData) {
  'use server';
  const { db, user } = await session();
  if (!user) redirect('/login?next=' + path);
  const parsed = z.object({
    id: z.uuid(), decision: z.enum(['revision','rejected','approved']),
    notes: z.string().trim().min(1).max(2000), identity: z.enum(['new','existing','distinct']),
    provider: z.union([z.literal(''),z.uuid()]),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(path + '?status=invalid');
  const { id, decision, notes, identity, provider } = parsed.data;
  const { error } = await db.rpc('review_ecosystem_application', {
    application_id: id, decision, notes, identity_decision: decision === 'approved' ? identity : null,
    target_provider: decision === 'approved' && identity === 'existing' ? provider || null : null,
  });
  if (error) redirect(path + '?id=' + id + '&status=invalid');
  revalidatePath('/regional-intelligence/ecosystem');
  revalidatePath('/partnerships');
  redirect(path + '?id=' + id + '&status=saved');
}

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; status?: string }> }) {
  const query = await searchParams;
  const { db, user } = await session();
  if (!user) redirect('/login?next=' + path);
  const { data: staff } = await db.rpc('user_is_admin');
  if (staff !== true) return <main className="account-shell"><h1>Administrator access required</h1><Link href="/portal">Return to your account</Link></main>;

  const selected = z.uuid().safeParse(query.id);
  const { data, error } = await db.rpc('ecosystem_application_queue', selected.success ? { application_id: selected.data } : {});
  const rows = (data ?? []) as Application[];
  return <><SiteHeader/><main className="work-room">
    <p><Link href="/admin">Team records</Link> · <Link href={path}>Application queue</Link> · <Link href="/admin/organization-identities">Organization identities</Link></p>
    <h1>Resource partner applications</h1>
    {query.status && <p role={query.status === 'saved' ? 'status' : 'alert'}>{query.status === 'saved' ? 'Decision saved.' : 'The decision could not be saved. Check the application status and identity selection.'}</p>}
    {error && <p role="alert">Applications could not be loaded.</p>}
    {!error && !rows.length && <p>{selected.success ? 'Application unavailable.' : 'No applications have been submitted.'}</p>}
    {selected.success ? rows.map(row => <ApplicationReview key={row.id} row={row}/>) : <ul>{rows.map(row =>
      <li key={row.id}><Link href={path + '?id=' + row.id}>{row.name}</Link> · {row.status} · {row.submittedAt.slice(0,10)}</li>
    )}</ul>}
  </main></>;
}

function ApplicationReview({ row }: { row: Application }) {
  const item = row.application;
  if (!item) return null;
  const candidates = row.candidates ?? [];
  const fields = [
    ['Official website', item.website], ['Category', item.category], ['Directory description', item.quickDescription],
    ['Additional program information', item.fullDescription], ['Service area', item.geographicRestrictions],
    ['Private applicant contact', [item.firstName, item.lastName, item.contactEmail, item.phone, item.extension].filter(Boolean).join(' · ')],
    ['Address', [item.address1,item.address2,item.city,item.state,item.zip].filter(Boolean).join(', ')],
    ['Public contact', [item.publicEmail,item.publicPhone].filter(Boolean).join(' · ')],
    ['Primary business type', item.primaryType], ['Primary business stage', item.primaryStage],
    ['Industry coverage', item.allIndustries ? 'All industries' : 'Selected industries'],
    ['Sector specialties', item.sectors.join(', ')], ['Other specialties', item.sectorSpecialties],
    ['Social pages', [item.linkedin,item.facebook,item.instagram,item.x].filter(Boolean).join(' · ')],
  ];
  return <article className="work-panel">
    <h2>{row.name}</h2><p>{row.status} · Submitted {row.submittedAt.slice(0,10)}</p>
    <dl>{fields.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {row.logo && <p><a href={row.logo} download="submitted-logo">Download submitted logo</a></p>}
    {!!Object.keys(item.selections).length && <details><summary>Business types, industries and services</summary><ul>
      {Object.entries(item.selections).map(([label, offering]) => <li key={label}>{label.replace('|',' · ')} · {offering}</li>)}
    </ul></details>}
    <h3>Identity review</h3>
    {candidates.length ? <ul>{candidates.map(candidate =>
      <li key={candidate.id}>{candidate.name} · {candidate.status} · <a href={candidate.website}>{candidate.website}</a></li>
    )}</ul> : <p>No directory candidates matched this name or website.</p>}
    {(row.status === 'pending' || row.status === 'revision') && <form action={review}>
      <input type="hidden" name="id" value={row.id}/>
      <label>Decision<select name="decision" required defaultValue=""><option value="" disabled>Choose a decision</option>
        <option value="approved">Approve and publish</option><option value="revision">Request revision</option><option value="rejected">Reject</option>
      </select></label>
      <label>Identity decision for approval<select name="identity" defaultValue={candidates.length ? 'existing' : 'new'}>
        <option value="new">Create a new provider</option><option value="existing">Update a matched provider</option>
        {item.programName && <option value="distinct">Publish as a distinct program</option>}
      </select></label>
      {candidates.length > 0 && <label>Matched provider<select name="provider"><option value="">Select a verified match</option>
        {candidates.map(candidate => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}
      </select></label>}
      {!candidates.length && <input type="hidden" name="provider" value=""/>}
      <label>Review and source notes<textarea name="notes" required maxLength={2000}/></label>
      <button>Save decision</button>
    </form>}
    {!!row.decisions?.length && <><h3>Decision history</h3><ul>{row.decisions.map(decision =>
      <li key={decision.id}>{decision.reviewed_at.slice(0,10)} · {decision.decision} · {decision.notes}{decision.identity_decision && ' · ' + decision.identity_decision}</li>
    )}</ul></>}
  </article>;
}
