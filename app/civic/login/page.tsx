'use client';

import {useRouter} from 'next/navigation';

import {useState} from 'react';

export default function Login(){const router=useRouter();const [error,setError]=useState('');return <section className="civic-login"><p className="eyebrow">YOUR PRIVATE CIVIC WORKSPACE</p><h1>Welcome back.</h1><p>Use your assigned synthetic demonstration account. This does not sign you into another organization.</p><form method="post" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const r=await fetch('/api/civic/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});if(r.ok)router.push('/civic');else setError((await r.json()).error);}}><label>Email<input name="email" type="email" required autoComplete="username"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label><button>Sign in</button><p role="alert">{error}</p></form></section>;}
