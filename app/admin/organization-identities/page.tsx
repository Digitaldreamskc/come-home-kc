import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import SiteHeader from '@/components/site-header';
import { session } from '@/lib/supabase';
import { identitySources, nameKey, websiteKey } from '@/lib/organization-identity-sources';
import '@/app/connected.css';

const path = '/admin/organization-identities';
type Reference = { dataset: string; record_id: string; organization_id: string; review_status: string; source_url: string; rationale: string };
type Registry = { identities: { id: string; label: string; aliases: string[] }[]; references: Reference[] };

async function save(form: FormData) {
  'use server';
  const { db, user } = await session();
  if (!user) redirect('/login?next=' + path);
  const { data: staff } = await db.rpc('user_is_admin');
  if (staff !== true) redirect('/admin');
  const parsed = z.object({
    dataset: z.enum(['atlas','ecosystem','employer','jessicas_list']), record: z.string().min(1).max(120),
    identity: z.union([z.literal(''),z.uuid()]), alias: z.string().trim().max(200),
    decision: z.enum(['verified','possible','rejected']), evidence: z.url({ protocol: /^https$/ }).max(500),
    notes: z.string().trim().min(1).max(2000),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(path + '?status=invalid');
  const { dataset, record, identity, alias, decision, evidence, notes } = parsed.data;
  const recordQuery = '&dataset=' + dataset + '&record=' + encodeURIComponent(record);
  const { records } = await identitySources();
  const source = records.find(item => item.dataset === dataset && item.id === record);
  if (!source) redirect(path + '?status=invalid' + recordQuery);
  const { error } = await db.rpc('review_organization_reference', {
    dataset_key: dataset, source_id: record, identity_id: identity || null,
    label: source.label, alias, decision, evidence, notes,
  });
  redirect(path + '?status=' + (error ? 'invalid' : 'saved') + recordQuery);
}

const sources = { ecosystem: 'Entrepreneurial Ecosystem', atlas: 'KC Capital Atlas', employer: '2KC Employers', jessicas_list: 'Jessica’s List' };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; dataset?: string; record?: string; status?: string }> }) {
  const { db, user } = await session();
  if (!user) redirect('/login?next=' + path);
  const { data: staff } = await db.rpc('user_is_admin');
  if (staff !== true) return <main className="account-shell"><h1>Administrator access required</h1></main>;
  const query = await searchParams;
  const [{ records, unavailable }, { data, error }] = await Promise.all([identitySources(), db.rpc('organization_identity_queue')]);
  const registry = data as Registry | null;
  const labels = new Map(registry?.identities.map(identity => [identity.id, identity.label]));
  const refKey = (dataset: string, id: string) => dataset + '|' + id;
  const verified = new Set(registry?.references.filter(ref => ref.review_status === 'verified').map(ref => refKey(ref.dataset,ref.record_id)));
  const possible = new Set(registry?.references.filter(ref => ref.review_status === 'possible').map(ref => refKey(ref.dataset,ref.record_id)));
  const unresolved = records.filter(item => !verified.has(refKey(item.dataset,item.id)) && !possible.has(refKey(item.dataset,item.id))).length;
  const selected = records.find(item => item.dataset === query.dataset && item.id === query.record);
  const selectedWebsite = websiteKey(selected?.website);
  const suggestions = selected ? records.filter(item => item.dataset !== selected.dataset && (
    nameKey(item.label) === nameKey(selected.label) || (selectedWebsite && websiteKey(item.website) === selectedWebsite)
  )) : [];
  const matches = query.q?.trim() ? records.filter(item => item.label.toLowerCase().includes(query.q!.trim().toLowerCase())) : [];
  return <><SiteHeader/><main className="work-room">
    <p><Link href="/admin">Team records</Link> · <Link href="/admin/ecosystem-applications">Resource partner applications</Link></p>
    <h1>Organization identity reconciliation</h1>
    {query.status && <p role="status">{query.status === 'saved' ? 'Identity decision saved.' : 'The decision could not be saved. Check the source and current identity link.'}</p>}
    {error && <p role="alert">Identity decisions could not be loaded.</p>}
    {unavailable.length > 0 && <p role="alert">Unavailable sources · {unavailable.join(', ')}</p>}
    <p>{verified.size} verified references · {possible.size} possible references · {unresolved} unlinked discovery records</p>
    <form method="get"><label>Find a source organization<input name="q" type="search" defaultValue={query.q}/></label><button>Search</button></form>
    {query.q && <ul>{matches.slice(0,40).map(item => <li key={refKey(item.dataset,item.id)}>
      <Link href={path + '?' + new URLSearchParams({ dataset: item.dataset, record: item.id, q: query.q! })}>{item.label}</Link> · {sources[item.dataset]}
    </li>)}{!matches.length && <li>No matches.</li>}</ul>}
    {selected && registry && <section className="work-panel">
      <h2>{selected.label}</h2><p>{sources[selected.dataset]} · {selected.id}</p>
      <h3>Candidate source records</h3>
      {suggestions.length ? <ul>{suggestions.map(item => <li key={refKey(item.dataset,item.id)}>
        <Link href={path + '?' + new URLSearchParams({ dataset: item.dataset, record: item.id })}>{item.label}</Link> · {sources[item.dataset]}
      </li>)}</ul> : <p>No cross-source matches by name or website.</p>}
      <form action={save}>
        <input type="hidden" name="dataset" value={selected.dataset}/><input type="hidden" name="record" value={selected.id}/>
        <label>Canonical identity<select name="identity"><option value="">Create a new identity for this source</option>
          {registry.identities.map(identity => <option key={identity.id} value={identity.id}>{identity.label}</option>)}</select></label>
        <label>Decision<select name="decision"><option value="possible">Possible match</option><option value="verified">Verify identity</option><option value="rejected">Reject match</option></select></label>
        <label>Verified alias (optional)<input name="alias" maxLength={200}/></label>
        <label>Evidence URL<input name="evidence" type="url" required defaultValue={selected.website ?? ''}/></label>
        <label>Evidence and decision notes<textarea name="notes" maxLength={2000} required/></label>
        <button>Save identity decision</button>
      </form>
    </section>}
    <h2>Recorded identity decisions</h2>
    <ul>{registry?.references.map(ref => <li key={refKey(ref.dataset,ref.record_id)+ref.organization_id}>
      {labels.get(ref.organization_id)} · {ref.dataset} · {ref.record_id} · {ref.review_status}. {ref.rationale} <a href={ref.source_url}>Source</a>
    </li>)}</ul>
  </main></>;
}
