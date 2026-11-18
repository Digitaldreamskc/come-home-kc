'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import PasswordField from '@/components/password-field';
export default function ResetPassword(){
 const [state,setState]=useState<'checking'|'ready'|'invalid'|'done'>('checking'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let alive=true;const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);db.auth.getUser().then(({data,error})=>{if(alive)setState(!error&&data.user&&!new URLSearchParams(window.location.search).has('error')?'ready':'invalid');}).catch(()=>{if(alive)setState('invalid');});return()=>{alive=false;};},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const password=String(f.get('password'));if(password!==f.get('confirmation')){setMessage('The passwords do not match.');return;}if(password.length<12){setMessage('Use at least 12 characters.');return;}setBusy(true);setMessage('');try{
  const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);const {error}=await db.auth.updateUser({password});
  if(error){setMessage(error.code==='same_password'?'Choose a password you have not used before.':'Could not update your password. Request a fresh reset link and try again.');return;}
  const {error:signOutError}=await db.auth.signOut();setState('done');setMessage(signOutError?'Your password is updated. Please close this browser session before signing in again.':'Your password is updated. Sign in with your new password.');
 }catch{setMessage('The connection was interrupted. Please try signing in or request a fresh reset link.');}finally{setBusy(false);}}
 return <main className="account-shell"><Link href="/login">← Back to sign in</Link><h1>Choose a new password</h1>{state==='checking'?<p>Checking your reset link…</p>:state==='invalid'?<p>This reset link is missing, expired, or already used. <Link href="/forgot-password">Request a new reset link</Link>.</p>:state==='done'?<Link href="/login">Sign in</Link>:<><p>Use at least 12 characters.</p><form onSubmit={submit}><PasswordField label="New password" autoComplete="new-password" minLength={12}/><PasswordField label="Confirm new password" name="confirmation" autoComplete="new-password" minLength={12}/><button disabled={busy}>{busy?'Saving…':'Update password'}</button></form></>}<p role="status">{message}</p></main>;
}
