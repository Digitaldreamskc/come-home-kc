'use client';
import {useHydrated} from '@/lib/hydration';
import {useId,useState,type Ref} from 'react';
export default function PasswordField({label='Password',name='password',autoComplete='current-password',minLength,error,hint,inputRef,onChange}:{label?:string;name?:string;autoComplete?:string;minLength?:number;error?:string;hint?:string;inputRef?:Ref<HTMLInputElement>;onChange?:()=>void}){
 const hydrated=useHydrated();const id=useId();const [visible,setVisible]=useState(false);
 return <div className="password-field"><label htmlFor={id}>{label}</label><div className="password-input"><input ref={inputRef} id={id} name={name} type={visible?'text':'password'} autoComplete={autoComplete} minLength={minLength} required aria-invalid={error?true:undefined} aria-describedby={error?id+'-error':hint?id+'-hint':undefined} onChange={onChange}/><button disabled={!hydrated} type="button" aria-controls={id} aria-pressed={visible} aria-label={`${visible?'Hide':'Show'} ${label.toLowerCase()}`} onClick={()=>setVisible(v=>!v)}>{visible?'Hide':'Show'}</button></div>{error?<p id={id+'-error'} className="field-error" role="alert">{error}</p>:hint?<p id={id+'-hint'} className="field-help">{hint}</p>:null}</div>;
}
