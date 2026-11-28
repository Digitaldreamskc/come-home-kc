import { atlasProjection, capitalProfiles, approvedResources } from '@/lib/regional-sources';
import { ecosystemProviders } from '@/lib/ecosystem-providers';
import { session } from '@/lib/supabase';

export type IdentitySource = {
  dataset: 'ecosystem' | 'atlas' | 'employer' | 'jessicas_list';
  id: string;
  label: string;
  website?: string | null;
};

export function nameKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function websiteKey(value?: string | null) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.hostname.replace(/^www\./i, '') + url.pathname.replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

export async function identitySources(): Promise<{records: IdentitySource[]; unavailable: string[]}> {
  const { db } = await session();
  const results = await Promise.allSettled([
    ecosystemProviders(), atlasProjection(), capitalProfiles(), approvedResources(),
    db.from('organizations').select('id,name,website').order('name').limit(1000).then(result => {
      if (result.error) throw result.error;
      return result.data;
    }),
  ] as const);
  const [ecosystem, atlas, profiles, directory, employers] = results;
  const capital = new Map(profiles.status === 'fulfilled' ? profiles.value.map(profile => [profile.entity_id, profile]) : []);
  const records: IdentitySource[] = [
    ...(ecosystem.status === 'fulfilled' ? ecosystem.value.map(p => ({ dataset: 'ecosystem' as const, id: p.id, label: p.name, website: p.website })) : []),
    ...(atlas.status === 'fulfilled' ? atlas.value.entities.filter(e => e.entity_type === 'organization').map(e => ({
      dataset: 'atlas' as const, id: e.entity_id, label: e.canonical_name, website: capital.get(e.entity_id)?.website,
    })) : [...capital.values()].map(p => ({ dataset: 'atlas' as const, id: p.entity_id, label: p.name, website: p.website }))),
    ...(directory.status === 'fulfilled' ? directory.value.filter(p => p.company?.trim()).map(p => ({
      dataset: 'jessicas_list' as const, id: String(p.id), label: p.company, website: p.website,
    })) : []),
    ...(employers.status === 'fulfilled' ? employers.value.map(p => ({ dataset: 'employer' as const, id: p.id, label: p.name, website: p.website })) : []),
  ];
  return {
    records: records.sort((a,b) => a.label.localeCompare(b.label)),
    unavailable: ['Ecosystem','Atlas research','Atlas capital','Jessica’s List','Employers'].filter((_, i) => results[i].status === 'rejected'),
  };
}
