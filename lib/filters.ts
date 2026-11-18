export type Region = 'all' | 'MO' | 'KS';
export type Category = 'talent' | 'resources' | 'employers';
export type WorkMode = 'all' | 'onsite' | 'hybrid' | 'remote';
export type Location = { id?: string; city?: string; state: string; verified_at?: string | null };
export type Organization = { id: string; name: string; description?: string | null; industry?: string | null; website?: string | null; headquarters_state?: string | null; status: string; verification_status: string; verified_at?: string | null; source_url?: string | null; organization_locations?: Location[] };
export type Job = { id: string; organization_id: string; title: string; description: string; industry?: string | null; work_mode: string; employment_type?: string | null; salary_range?: string | null; application_url?: string | null; application_instructions?: string | null; status: string; verified_at?: string | null; expires_at?: string | null; remote_eligible_states?: string[]; job_locations?: Location[] };
export type Resource = { id: string; title: string; description?: string | null; category?: string | null; url: string; contact_url?: string | null; status: string; verified_at?: string | null; resource_eligibility?: Array<{ state: string; notes?: string; verified_at?: string | null }> };
export type RegionalEvent = { id: string; title: string; description?: string | null; starts_at: string; location?: string | null; state?: string | null; eligible_states?: string[]; audience?: string | null; registration_url?: string | null; capacity?: number | null; status: string; verified_at?: string | null };
export type Catalog = { organizations: Organization[]; jobs: Job[]; resources: Resource[]; events: RegionalEvent[] };
export type Filters = { region: Region; category: Category; query: string; industry: string; workMode: WorkMode; city: string };
export const DEFAULT_FILTERS: Filters = { region: 'all', category: 'talent', query: '', industry: '', workMode: 'all', city: '' };
export const NEW2KC_INTAKE = 'https://docs.google.com/forms/d/e/1FAIpQLSfnWTbHNmGrOPfWz_tdE9hk7dEjGWouoVOy1PGzN967kufAWA/viewform';
export const REGION_LABELS: Record<Region,string> = { all: 'All KC', MO: 'Missouri', KS: 'Kansas' };
export function safeExternalUrl(value?: string | null): string | null { if (!value) return null; try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
export function parseFilters(search: string, rememberedRegion?: string | null): Filters {
 const p = new URLSearchParams(search); const raw = p.get('region') ?? rememberedRegion;
 return { region: raw === 'MO' || raw === 'KS' ? raw : 'all', category: p.get('category') === 'resources' || p.get('category') === 'employers' ? p.get('category') as Category : 'talent', query: p.get('q') ?? '', industry: p.get('industry') ?? '', city: p.get('city') ?? '', workMode: ['onsite','hybrid','remote'].includes(p.get('work') ?? '') ? p.get('work') as WorkMode : 'all' };
}
export function filtersToSearch(filters: Filters, existing = ''): string { const p = new URLSearchParams(existing); p.set('region',filters.region); p.set('category', filters.category); for(const [key,value] of [['q',filters.query],['industry',filters.industry],['city',filters.city],['work',filters.workMode === 'all' ? '' : filters.workMode]]) { if(value)p.set(key,value);else p.delete(key); } return p.toString(); }
function textMatches(query: string,...values: Array<string | null | undefined>) { return !query.trim() || values.join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()); }
export function verifiedStates(locations: Location[] = []): string[] { return [...new Set(locations.filter(l=>l.verified_at && ['MO','KS'].includes(l.state)).map(l=>l.state))]; }
function covers(states: string[], region: Region): boolean { return region === 'all' ? states.some(s=>s==='MO'||s==='KS') : states.includes(region); }
export function jobIsCurrent(job: Job, now = Date.now()): boolean { return job.status === 'active' && !!job.verified_at && !!safeExternalUrl(job.application_url) && !!job.expires_at && Number.isFinite(Date.parse(job.expires_at)) && Date.parse(job.expires_at)>now; }
export function filterJobs(jobs: Job[], organizations: Organization[], filters: Filters, now = Date.now()): Job[] { return jobs.filter(j=>{
 const org=organizations.find(o=>o.id===j.organization_id); if(!org || org.status!=='published' || org.verification_status!=='verified' || !jobIsCurrent(j,now))return false;
 const states=j.work_mode==='remote' ? j.remote_eligible_states ?? [] : verifiedStates(j.job_locations);
 return covers(states, filters.region) && textMatches(filters.query,j.title,j.description,org.name,j.industry) && (!filters.industry || j.industry===filters.industry) && (filters.workMode==='all'||j.work_mode===filters.workMode) && (!filters.city||(j.job_locations??[]).some(l=>l.verified_at&&l.city===filters.city));
 }); }
export function filterOrganizations(organizations: Organization[], filters: Filters): Organization[] { return organizations.filter(o=>o.status==='published' && (filters.region==='all'||covers(verifiedStates(o.organization_locations),filters.region)) && textMatches(filters.query,o.name,o.description,o.industry) && (!filters.industry||o.industry===filters.industry) && (!filters.city||(o.organization_locations??[]).some(l=>l.verified_at&&l.city===filters.city))); }
export function filterResources(resources: Resource[],filters: Filters): Resource[] { return resources.filter(r=>r.status==='published' && !!r.verified_at && covers(verifiedStates(r.resource_eligibility),filters.region) && textMatches(filters.query,r.title,r.description,r.category) && !!safeExternalUrl(r.url)); }
export function filterEvents(events: RegionalEvent[],filters: Filters,now=Date.now()):RegionalEvent[] {return events.filter(e=>e.status==='published'&&!!e.verified_at&&Date.parse(e.starts_at)>=now&&covers(e.eligible_states??(e.state?[e.state]:[]),filters.region)&&textMatches(filters.query,e.title,e.description,e.audience)&&!!safeExternalUrl(e.registration_url));}
