// Hosted review is opt-in, preview-only, and pinned to the synthetic database.
export const isolatedDatabase = 'https://kxuvmilbvwwcrxiqnftx.supabase.co';
// A live account deployment must use a separate, explicitly pinned database and host.
export function liveAccountsAllowed(host: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const expected = process.env.LIVE_ACCOUNTS_SUPABASE_URL;
  const expectedHost = process.env.LIVE_ACCOUNTS_HOST;
  return process.env.ENABLE_LIVE_ACCOUNTS === '1'
    && process.env.ENABLE_PROTECTED_PREVIEW !== '1'
    && process.env.VERCEL_ENV === 'production'
    && !!expectedHost && host === expectedHost
    && !!url && !!expected && url === expected && url !== isolatedDatabase
    && process.env.GMAIL_DELIVERY_ENABLED === 'false';
}
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
  if (liveAccountsAllowed(process.env.LIVE_ACCOUNTS_HOST || null)) return !!email;
  return process.env.ENABLE_PROTECTED_PREVIEW === '1'
    && process.env.VERCEL_ENV === 'preview'
    && !!email && (process.env.REVIEW_ALLOWED_EMAILS || '').split(',')
      .map(value => value.trim().toLowerCase()).includes(email.toLowerCase());
}
