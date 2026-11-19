// Hosted review is opt-in, preview-only, and pinned to the synthetic database.
export const isolatedDatabase = 'https://kxuvmilbvwwcrxiqnftx.supabase.co';
export function hostedReviewAllowed(host: string | null) {
  return process.env.ENABLE_PROTECTED_PREVIEW === '1'
    && process.env.VERCEL_ENV === 'preview'
    && !!process.env.VERCEL_URL && host === process.env.VERCEL_URL
    && process.env.NEXT_PUBLIC_SUPABASE_URL === isolatedDatabase
    && process.env.CIVIC_SUPABASE_URL === isolatedDatabase
    && process.env.GMAIL_DELIVERY_ENABLED === 'false';
}
export function reviewUserAllowed(email: string | undefined) {
  if (!process.env.VERCEL) return true;
  return process.env.ENABLE_PROTECTED_PREVIEW === '1'
    && process.env.VERCEL_ENV === 'preview'
    && !!email && (process.env.REVIEW_ALLOWED_EMAILS || '').split(',')
      .map(value => value.trim().toLowerCase()).includes(email.toLowerCase());
}
