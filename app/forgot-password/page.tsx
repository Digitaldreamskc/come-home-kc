'use client';
import Link from 'next/link';
import {useHydrated} from '@/lib/hydration';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
export default function ForgotPassword(){const hydrated=useHydrated();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('');const email=String(new FormData(e.currentTarget).get('email')).trim().toLowerCase();if(process.env.NEXT_PUBLIC_SUPABASE_URL==='https://kxuvmilbvwwcrxiqnftx.supabase.co'&&!['mary@socialbalances.com','jessica@socialbalances.com'].includes(email)){setMessage('Password recovery in this review is reserved for authorized staff.');setBusy(false);return;}try{
  const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/auth/callback?next=/reset-password'});
  if(error){setMessage(error.status===429?'Please wait a few minutes before requesting another reset.':'We could not send a reset email. Please try again or contact the team.');return;}
  setMessage('If an account exists for this email, you will receive a password reset link. Open it in this browser to choose a new password.');
 }catch{setMessage('Could not connect. Please try again.');}finally{setBusy(false);}}
 return <main className="account-shell"><Link href="/login">← Back to sign in</Link><h1>Forgot your password?</h1><p>Enter your account email and we’ll send a reset link.</p><form onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><button disabled={busy||!hydrated}>{busy?'Sending…':'Send reset link'}</button></form><p role="status">{message}</p></main>;
}
