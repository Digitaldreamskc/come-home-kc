import { publicDb } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { fail, sameOrigin, body } from '@/lib/http';
import { z } from 'zod';

const inquiry = z.object({
  name: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  email: z.string().trim().max(254).refine(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter an email address'),
  message: z.string().trim().max(5000).optional().default(''),
  contact_consent: z.literal(true),
  website_trap: z.literal(''),
}).strict();

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Origin not allowed.', 403);
  try {
    const parsed = inquiry.parse(await body(req));
    const db = publicDb();
    const { error } = await db.rpc('start_partner_conversation', {
      p_name: parsed.name,
      p_organization: parsed.organization,
      p_role: parsed.role,
      p_email: parsed.email,
      p_message: parsed.message,
      p_consent: true,
    });
    if (error) return fail('Could not save your note. Please try again.');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('Please check the form fields.');
  }
}
