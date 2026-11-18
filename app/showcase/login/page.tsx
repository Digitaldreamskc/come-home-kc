'use client';

import {useRouter} from 'next/navigation';

import {useState} from 'react';

export default function Login(){const router=useRouter();const [error,setError]=useState('');return <main style={{maxWidth:520,margin:'60px auto',padding:24}}><h1>Private platform review</h1><p>Sign in with an authorized synthetic showcase reviewer account.</p><form onSubmit={async e=>{e.preventDefault();const r=await fetch('/showcase/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});if(r.ok)router.push('/showcase');else setError('Could not authorize this review session.');}}><label>Email<input name="email" type="email" required/></label><label>Password<input name="password" type="password" required/></label><button>Sign in</button><p role="alert">{error}</p></form></main>;}
