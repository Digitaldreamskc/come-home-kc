import { session } from '@/lib/supabase';
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
    const {db,user}=await session();
    if(!user)return fail('Sign in to save a conversation request in this protected preview.',401);
    const {error}=await db.rpc('submit_intake',{p_kind:'partnership',p_payload:{name:parsed.name,description:parsed.message||'Founding partnership conversation',organization:parsed.organization,role:parsed.role,contact_email:parsed.email,contact_consent:parsed.contact_consent,website_trap:''}});
    if (error) return fail('Could not save your note. Please try again.');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('Please check the form fields.');
  }
}
