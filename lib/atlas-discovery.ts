import { atlasProjection, capitalProfiles } from '@/lib/regional-sources';

export type DiscoveryEntry = {
  id: string; name: string; type: string; city: string; state: string;
  focus: string; stage: string; sector: string; sectors: string[]; check: string;
  claims: { id: string; label: string; value: string; url: string }[];
  link?: string; website: string; source: string; updatedAt: string;
};

export async function directoryEntries(): Promise<DiscoveryEntry[]> {
  const [profiles, research] = await Promise.all([capitalProfiles(), atlasProjection().catch(() => null)]);
  return profiles.map(profile => {
    const claims = research?.claims.filter(claim =>
      claim.subject_id === profile.entity_id &&
      ['approved', 'excerpt_matched'].includes(claim.status) &&
      claim.source_url?.startsWith('https://') &&
      ['stated_focus', 'description', 'stated_model', 'program', 'fund_close', 'fund_launch',
        'reported_aum', 'investment_classification', 'portfolio_summary', 'founded', 'operating_since'].includes(claim.field)
    ) ?? [];
    const navigator = research?.resources.find(resource =>
      resource.entity_id === profile.entity_id && resource.match_status === 'verified_identity' &&
      resource.profile_url?.startsWith('https://')
    );

    return {
      id: profile.entity_id, name: profile.name, type: profile.type,
      city: profile.city ?? '', state: profile.state ?? '', focus: profile.focus ?? '',
      stage: profile.stage ?? '', sector: profile.sector ?? '', sectors: profile.sectors,
      check: profile.check ?? '', website: profile.website, source: profile.source_url,
      updatedAt: profile.updated_at, link: navigator?.profile_url,
      claims: claims.map(claim => ({
        id: claim.claim_id, label: claim.field.replaceAll('_', ' '), value: claim.value, url: claim.source_url,
      })),
    };
  });
}
