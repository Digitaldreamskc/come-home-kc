'use client';
import {useHydrated} from '@/lib/hydration';
import {useId,useState} from 'react';
export default function PasswordField({label='Password',name='password',autoComplete='current-password',minLength}:{label?:string;name?:string;autoComplete?:string;minLength?:number}){
 const hydrated=useHydrated();const id=useId();const [visible,setVisible]=useState(false);
 return <div className="password-field"><label htmlFor={id}>{label}</label><div className="password-input"><input id={id} name={name} type={visible?'text':'password'} autoComplete={autoComplete} minLength={minLength} required/><button disabled={!hydrated} type="button" aria-controls={id} aria-pressed={visible} aria-label={`${visible?'Hide':'Show'} ${label.toLowerCase()}`} onClick={()=>setVisible(v=>!v)}>{visible?'Hide':'Show'}</button></div></div>;
}
