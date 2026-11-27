'use client';
import {useState} from 'react';

export default function WelcomeForm({url}:{url:string}) {
  const [open,setOpen]=useState(false);
  const embed=new URL(url);
  embed.searchParams.set('embedded','true');
  return <>
    <div className="partner-hero-actions">
      <button type="button" className="partner-button partner-primary" aria-expanded={open} aria-controls="welcome-questionnaire" onClick={()=>setOpen(!open)}>{open?'Hide questionnaire':'Open questionnaire here'}</button>
      <a className="partner-button partner-secondary" href={url}>Open in Google Forms</a>
    </div>
    <div id="welcome-questionnaire">{open&&<iframe title="New2KC welcome questionnaire" src={embed.href} referrerPolicy="no-referrer" style={{width:'100%',height:'80vh',marginTop:'1rem',border:0}}/>}</div>
  </>;
}
