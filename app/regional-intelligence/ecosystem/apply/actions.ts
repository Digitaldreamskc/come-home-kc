'use server';

import { publicDb } from '@/lib/supabase';
import { applicationSchema } from '@/lib/ecosystem-application-schema';

export async function submitApplication(_message: string, form: FormData): Promise<string> {
  const fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string'));
  const selections = Object.fromEntries(Object.entries(fields)
    .filter(([key, value]) => key.startsWith('selection:') && value)
    .map(([key, value]) => [key.slice('selection:'.length), value]));
  const application = Object.fromEntries(Object.entries(fields)
    .filter(([key]) => !key.startsWith('$ACTION_') && !key.startsWith('selection:') &&
      !['consent', 'allIndustries', 'sectors'].includes(key)));
  const parsed = applicationSchema.safeParse({
    ...application, selections, sectors: form.getAll('sectors'),
    allIndustries: form.has('allIndustries'), consent: form.has('consent'),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return issue.path.length ? `${String(issue.path[0])} — ${issue.message}` : issue.message;
  }

  const file = form.get('logo');
  let mime: string | undefined;
  let logo: string | undefined;
  if (file instanceof File && file.size) {
    if (file.size > 1048576 || !['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      return 'Choose a PNG, JPEG or GIF logo of 1 MB or less.';
    }
    mime = file.type;
    logo = Buffer.from(await file.arrayBuffer()).toString('base64');
  }

  try {
    const { error } = await publicDb().rpc('submit_ecosystem_application', { application: parsed.data, mime, logo });
    if (error) return error.code === '22023' ? 'Check the application fields and logo format.' : 'The application could not be saved. Please try again.';
  } catch {
    return 'The application could not be saved. Please try again.';
  }
  return 'submitted';
}
