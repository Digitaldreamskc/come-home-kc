"use client";
import { useEffect, useRef, useState, useId } from 'react';
import Link, { useOpenDemo } from '@/components/open-demo/link';
import { BrandIdentity } from '@/components/tenant-ui';
import { tenant } from '@/lib/tenant-config';
import '@/app/partners/fonts.css';
import '@/app/partners/partners.css';

const pillars = [
 ['Attract & reconnect talent', 'Inspire, reach and re-engage talent with Kansas City’s opportunities.'],
 ['Build community & belonging', 'Create meaningful connections and a stronger sense of home.'],
 ['Open pathways to opportunity', 'Expand access to mentorship, learning and career growth across the region.'],
 ['Regional talent data', 'Turn shared data into action with a regional view of talent trends.'],
] as const;
const reasons = [
 ['Build a stronger talent ecosystem', 'Invest in the people and connections that keep Kansas City competitive for the long term.'],
 ['Help people put down roots', 'Make it easier for talent to discover, choose and feel at home in Kansas City.'],
 ['Insights that tell your story', 'Real data and stories that strengthen your employer brand and show your community impact.'],
] as const;
const benefits = [
 ['Founding Circle', 'Join the inaugural group of Kansas City employers investing in Back2KC’s next decade.', '[Add specifics: recognition, seats, term length]'],
 ['Stories of Impact', 'Support a community storytelling series by KC filmmakers and share verified, real stories of the region you help strengthen.', '[Add specifics: storytelling schedule, formats, sharing permissions]'],
 ['Employee Engagement', 'Opportunities for your team to take part in community gatherings, volunteering and mentorship.', '[Add specifics: activities, availability, participation process]'],
 ['Leadership Story Kit', 'A year-end summary with key highlights, meaningful stories and talking points your leadership can share with confidence.', '[Add specifics: delivery timing, formats, included materials]'],
] as const;
const intro = 'Four benefits that turn your investment into stories, data and engagement your team can use.';
function Icon({kind}:{kind:'nodes'|'house'|'chart'|'check'|'chevron'|'camera'|'menu'|'close'}) {
 const paths={nodes:<><circle cx="6" cy="5" r="3"/><circle cx="26" cy="5" r="3"/><circle cx="16" cy="26" r="3"/><path d="M9 5h14M7.5 8l7 15M24.5 8l-7 15"/></>,house:<><path d="m3 15 13-11 13 11M7 13v15h18V13M13 28V18h6v10"/></>,chart:<path d="M4 3v25h25M11 23V13M19 23V5M27 23v-7"/>,check:<path d="m6 16 6 6L26 8"/>,chevron:<path d="m7 12 9 9 9-9"/>,camera:<><path d="M4 9h6l3-4h6l3 4h6v19H4Z"/><circle cx="16" cy="18" r="6"/></>,menu:<path d="M4 8h24M4 16h24M4 24h24"/>,close:<path d="m7 7 18 18M25 7 7 25"/>};
 return <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
function Accordion({items,variant}:{items:ReadonlyArray<readonly [string,string,string?]>;variant:'pillars'|'benefits'}){
 const [active,setActive]=useState<number|null>(0);const id=useId();
 return <div className={'partner-accordion partner-accordion--'+variant}>{items.map(([title,copy,todo],i)=><section key={title}><h3><button type="button" id={`${id}-heading-${i}`} aria-expanded={active===i} aria-controls={`${id}-panel-${i}`} onClick={()=>setActive(active===i?null:i)}><span className="partner-number">0{i+1}</span><span>{title}</span><Icon kind="chevron"/></button></h3><div role="region" aria-labelledby={`${id}-heading-${i}`} id={`${id}-panel-${i}`} hidden={active!==i}><p>{copy}</p>{todo&&<p className="partner-todo">TODO: {todo}</p>}</div></section>)}</div>;
}
function PartnerHeader({overview,benefitsHref,benefitsPage}:{overview:string;benefitsHref:string;benefitsPage:boolean}){
 const [menu,setMenu]=useState(false);const trigger=useRef<HTMLButtonElement>(null);const id=useId();
 const links=<><Link href={overview+'#why'}>Why join</Link><Link href={overview+'#impact'}>Our impact</Link><Link href={benefitsHref} aria-current={benefitsPage?'page':undefined}>Partner benefits</Link><Link href={overview+'#anniversary'}>10th anniversary</Link><Link className="partner-header-cta" href={benefitsPage?'#contact':overview+'#contact'}>Start a conversation</Link></>;
 return <header className="partner-header" onKeyDown={e=>{if(e.key==='Escape'&&menu){setMenu(false);trigger.current?.focus();}}}><div className="partner-container partner-header-inner"><BrandIdentity config={tenant} homeHref={overview} heartColor="#1CB5E5"/><nav className="partner-desktop-nav" aria-label="Partner navigation">{links}</nav><button ref={trigger} className="partner-menu-toggle" type="button" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} aria-controls={id} onClick={()=>setMenu(!menu)}><Icon kind={menu?'close':'menu'}/></button></div><nav id={id} className="partner-mobile-nav" aria-label="Mobile partner navigation" hidden={!menu} onClick={()=>setMenu(false)}>{links}</nav></header>;
}
function PartnerFooter(){return <footer className="partner-footer"><div className="partner-container"><p>Come Home KC · by Back2KC + New2KC</p><div><a href="#contact">Contact</a><span className="partner-footer-todo">TODO: contact email · social links</span></div></div></footer>;}
type Inquiry = { name: string; organization: string; role: string; email: string; message: string };

export default function FoundingPartner({ layout = 'page', benefitsPage = false }: { layout?: 'page' | 'embedded'; benefitsPage?: boolean }) {
  const demo = useOpenDemo();
  const overview = demo ? '/demo/partners' : '/partners';
  const benefitsHref = demo ? '/demo/partner-benefits' : '/partner-benefits';
  const [saved, setSaved] = useState<Inquiry | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (open) firstField.current?.focus();
    else if (opened.current) toggleRef.current?.focus();
    opened.current = open;
  }, [open]);
  function toggleForm() { setOpen(current => !current); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const inquiry: Inquiry = {
      name: String(form.get('name') || ''),
      organization: String(form.get('organization') || ''),
      role: String(form.get('role') || ''),
      email: String(form.get('email') || ''),
      message: String(form.get('message') || ''),
    };
    if (demo) {
      setSaved(inquiry);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inquiry, contact_consent: form.has('contact_consent'), website_trap: String(form.get('website_trap') || '') }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(typeof payload.error === 'string' ? payload.error : 'Could not send your note. Please try again.');
        return;
      }
      setSaved(inquiry);
    } catch {
      setMessage('Could not send your note. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className={'partner-redesign '+(layout==='embedded'?'partner-embedded-view':'')}>
    {layout==='page'&&<><a href="#partner-content" className="skip-link">Skip to content</a><PartnerHeader overview={overview} benefitsHref={benefitsHref} benefitsPage={benefitsPage}/></>}
    <main id="partner-content">
      {benefitsPage?<div className="partner-benefits-main partner-container"><Link className="partner-back" href={overview}>← Back to overview</Link><p className="partner-eyebrow">2027 Founding partners</p><h1>What founding partners receive</h1><p className="partner-benefits-intro">{intro} Select one to see the details.</p><Accordion items={benefits} variant="benefits"/></div>:<>
        <section className="partner-hero-new partner-container" aria-labelledby="partner-title"><div className="partner-hero-text"><p className="partner-eyebrow"><span className="partner-desktop-eyebrow">Back2KC · 2027 Founding Employer & Talent Partner</span><span className="partner-mobile-eyebrow">Back2KC · 2027 Founding Partner</span></p><h1 id="partner-title">Invest in the next generation of Kansas City’s workforce.</h1><p className="partner-intro">A year-round charitable partnership that helps Kansas City keep its talent, welcome newcomers and give the next generation more reasons to build their future here.</p><div className="partner-hero-actions"><a className="partner-button partner-primary" href="#contact">Start a conversation <span aria-hidden="true">→</span></a><Link className="partner-button partner-secondary" href={benefitsHref}>See partner benefits</Link></div><p className="partner-anniversary-note"><span aria-hidden="true"/>Back2KC turns 10 on September 17, 2027</p></div><div className="partner-photo-placeholder" role="img" aria-label="Placeholder for a real photo of Union Station or the Kansas City skyline at dusk"><Icon kind="camera"/><p>TODO: Real photo of Union Station<br/>or the KC skyline at dusk</p><small>One strong image, not an illustration</small></div></section>
        <section id="why" className="partner-why partner-container" aria-labelledby="why-title"><h2 id="why-title">Why employers join</h2><div className="partner-reasons">{reasons.map(([title,copy],i)=><article key={title}><Icon kind={(['nodes','house','chart'] as const)[i]}/><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
        <section id="impact" className="partner-impact" aria-labelledby="impact-title"><div className="partner-container"><div className="partner-impact-heading"><h2 id="impact-title">Four pillars of community impact</h2><p className="partner-desktop-impact-intro">Your partnership funds work across all four.</p><p className="partner-mobile-impact-intro">Tap a pillar to learn more.</p></div><div className="partner-pillar-grid">{pillars.map(([title,copy],i)=><article key={title}><span className="partner-number">0{i+1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><div className="partner-mobile-pillars"><Accordion items={pillars} variant="pillars"/></div></div></section>
        <section className="partner-teaser partner-container" aria-labelledby="receive-title"><div><h2 id="receive-title">What founding partners receive</h2><p>{intro}</p></div><ul>{benefits.map(([title])=><li key={title}><Icon kind="check"/><span>{title}</span></li>)}</ul><Link className="partner-all-benefits" href={benefitsHref}>See all partner benefits →</Link></section>
      </>}
      <section className={'partner-contact-wrap partner-container'+(benefitsPage?' partner-contact-wrap--benefits':'')} id="anniversary"><div id="contact" className="partner-contact" aria-labelledby="conversation-title">
        {saved?<div role="status"><p className="partner-eyebrow">CONVERSATION</p><h2 id="conversation-title">{demo?'Your demo note is complete.':'The team has your note.'}</h2><p>{demo?'This conversation stayed in this browser. Nothing was submitted, saved, or emailed. Refresh the page to clear it.':'An operator will follow up at the email you provided. Nothing has been charged. Partnership details wait for a written agreement.'}</p><p>You are not opted into marketing. This note does not share candidate information.</p></div>:<>
          {!benefitsPage&&<p className="partner-eyebrow">10th anniversary · September 17, 2027</p>}
          <h2 id="conversation-title">{benefitsPage?'Ready to join the Founding Circle?':'Be part of Back2KC’s next decade.'}</h2><p>{benefitsPage?'We’ll walk you through partnership options and timing.':'Join the founding group of Kansas City employers investing in what comes next.'}</p>
          <button ref={toggleRef} type="button" className="partner-button partner-primary" aria-expanded={open} aria-controls="partner-conversation-form" onClick={toggleForm}>{open?'Hide conversation form':<>Start a conversation <span aria-hidden="true">→</span></>}</button>
          <div id="partner-conversation-form" hidden={!open}>
            <p>Share a name, organization, role and email. A message is optional. This is a conversation, not a hire request and not a payment.</p>
            <form onSubmit={submit}>
              <div className="partner-fields">
                <label>Name (required)<input ref={firstField} name="name" required maxLength={200} autoComplete="name"/></label>
                <label>Organization (required)<input name="organization" required maxLength={200} autoComplete="organization"/></label>
                <label>Role (required)<input name="role" required maxLength={200} autoComplete="organization-title"/></label>
                <label>Email (required)<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
              </div>
              <label>Message (optional)<textarea name="message" rows={4} maxLength={5000} placeholder="What would you like to talk about?"/></label>
              <fieldset className="consent-choices"><legend>Contact</legend><label><input type="checkbox" name="contact_consent" required/>Back2KC may contact me about this conversation. (required)</label></fieldset>
              <div hidden><label>Leave blank<input name="website_trap" tabIndex={-1} autoComplete="off"/></label></div>
              <p role="alert" className="partner-form-error">{message}</p>
              <button className="partner-button partner-primary" disabled={busy}>{busy ? 'Sending…' : 'Start a conversation'}</button>
            </form>
          </div>
        </>}
      </div></section>
    </main>
    {layout==='page'&&<PartnerFooter/>}
  </div>;
}
