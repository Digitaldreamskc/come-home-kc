'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { session } from '@/lib/supabase';
import { capitalProfiles } from '@/lib/regional-sources';
import { workspaceReturn } from '@/lib/workspace-return';
import { providerStages } from '@/lib/provider-followups';

export async function saveProviderFollowup(form: FormData) {
  const { db, user } = await session();
  if (!user) redirect('/login?next=/partnerships');
  const { data: staff } = await db.rpc('user_is_admin');
  if (staff !== true) redirect(await workspaceReturn('unavailable'));
  const parsed = z.object({
    case: z.uuid(), followup: z.union([z.literal(''),z.uuid()]), provider: z.string().max(140),
    reason: z.string().trim().max(1000), owner: z.uuid(), dueDate: z.iso.date(),
    nextAction: z.string().trim().min(1).max(500),
    stage: z.enum(providerStages.map(([key]) => key)), evidence: z.string().trim().max(3000),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(await workspaceReturn('unavailable'));

  const values = parsed.data;
  const [dataset, provider] = values.provider.split(':');
  let source: string | null = null;
  if (!values.followup) {
    if (!values.reason || !provider || !['atlas','ecosystem'].includes(dataset)) redirect(await workspaceReturn('unavailable'));
    if (dataset === 'atlas') {
      const canonical = (await capitalProfiles().catch(() => [])).find(item => item.entity_id === provider);
      if (!canonical) redirect(await workspaceReturn('unavailable'));
      source = canonical.source_url;
    } else if (!z.uuid().safeParse(provider).success) redirect(await workspaceReturn('unavailable'));
  }

  const { error } = await db.rpc('save_case_provider_followup', {
    case_key: values.case, followup_key: values.followup || null, dataset_key: dataset || null,
    provider_key: provider || null, provider_source: source, reason: values.reason,
    assigned_owner: values.owner, action_text: values.nextAction, due_date: values.dueDate,
    next_stage: values.stage, evidence_text: values.evidence,
  });
  revalidatePath('/partnerships');
  revalidatePath('/admin');
  redirect(await workspaceReturn(error ? 'unavailable' : 'saved'));
}
