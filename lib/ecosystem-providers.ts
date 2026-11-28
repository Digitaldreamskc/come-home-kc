import { publicDb } from './supabase';

export type EcosystemProvider = {
  id: string; name: string; category: string; description: string; website: string; stage: string;
  industry: string; needs: string[]; area: string; source: string; reviewed: string;
  sectors: string[]; serves_all_industries: boolean; industry_specialties: string;
  business_stages: string[]; business_types: string[]; public_email: string | null; public_phone: string | null;
};

export async function ecosystemProviders(): Promise<EcosystemProvider[]> {
  const { data, error } = await publicDb().from('ecosystem_providers')
    .select('id,name,category,description,website,stage,industry,needs,area,source,reviewed,sectors,serves_all_industries,industry_specialties,business_stages,business_types,public_email,public_phone')
    .eq('status', 'published').order('name');
  if (error) throw Error('Ecosystem directory unavailable');
  return data ?? [];
}
