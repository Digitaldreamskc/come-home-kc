'use client';
import { useEffect, useRef, useState } from 'react';
import Link, { useOpenDemo } from '@/components/open-demo/link';
import { BrandIdentity } from '@/components/tenant-ui';
import { tenant } from '@/lib/tenant-config';

const pillars = [
  ['Attract & reconnect talent', 'Regional storytelling, outreach and opportunities that help graduates, professionals, entrepreneurs and former Kansas Citians discover a future in the region.'],
  ['Build community & belonging', 'New2KC and Back2KC connections, gatherings and resources that help returning and relocating people establish roots and supportive relationships.'],
  ['Open pathways to opportunity', 'Inclusive mentorship, career exploration, community learning and connections across education, entrepreneurship and the regional workforce ecosystem.'],
  ['Dynamic datasets & analytics', 'Program coordination, partnerships, and dynamic datasets and analytics to understand regional talent needs, identify opportunities, and strengthen the community ecosystem.'],
] as const;

const benefits = [
  ['Regional Talent & Community Insights Briefing', 'A concise briefing, a leadership discussion and practical recommendations for your employer story, relocation experience and community engagement. Every finding identifies its source, time period and participating audience.'],
  ['Founding Circle', 'Join the inaugural group of 2027 Founding Partners, recognized together as Kansas City employers investing in Back2KC\'s next decade.'],
  ['Stories of Impact', 'Support a community documentary series by emerging KC filmmakers. Share published stories and verified highlights of the region you help strengthen.'],
  ['Employee engagement', 'Opportunities for employees to take part in appropriate community gatherings, volunteering and mentorship.'],
  ['Leadership Story Kit', 'A concise year-end impact summary, meaningful stories and sourced talking points your leadership can share with confidence.'],
] as const;

type Inquiry = { name: string; organization: string; role: string; email: string; message: string };

export default function FoundingPartner({ layout = 'page' }: { layout?: 'page' | 'embedded' }) {
  const demo = useOpenDemo();
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

  return <div className={layout === 'page' ? 'partner-page' : 'partner-embedded'}>
    {layout === 'page' && <>
      <a href="#start-a-conversation" className="skip-link">Skip to conversation</a>
      <header className="site-header"><div className="header-inner"><BrandIdentity config={tenant}/><details className="mobile-menu" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary>Menu</summary><nav aria-label="Mobile navigation"><Link href="/">Explore</Link><Link href="/partners">Founding partners</Link><CommunityLink>Get connected</CommunityLink></nav></details><nav aria-label="Main navigation"><Link href="/">Explore</Link><Link href="/partners" aria-current="page">Founding partners</Link><CommunityLink>Get connected</CommunityLink><Link href={demo?'/demo/kcnow':'/login'} className="button button-outline small">{demo?'KC Now concept':'Sign in'}</Link></nav></div></header>
    </>}
    <main className="partner-main">
      <section className="partner-hero">
        <p className="eyebrow">BACK2KC / 2027 FOUNDING EMPLOYER & TALENT PARTNER</p>
        <h1>Invest in the next generation of Kansas City&apos;s workforce.</h1>
        <div className="partner-hero-copy">
          <p>A year-round charitable partnership strengthening the relationships, opportunities and sense of belonging that help people build their futures in Kansas City.</p>
          <p>Help create a Kansas City where talent finds opportunity, newcomers find community, and the next generation has more reasons to build its future here.</p>
          <p>2027 milestone: Back2KC&apos;s 10th anniversary celebration is planned for September 17, 2027.</p>
        </div>
      </section>

      <section aria-labelledby="pillars-title">
        <h2 id="pillars-title">Four pillars of community impact</h2>
        <ol className="partner-pillars">{pillars.map(([title, copy], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
      </section>

      <section aria-labelledby="receive-title">
        <h2 id="receive-title">What founding partners receive</h2>
        <div className="partner-benefits">{benefits.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section id="start-a-conversation" className="partner-inquiry" aria-labelledby="conversation-title">
        {saved ? <div className="registration-receipt"><p className="eyebrow">CONVERSATION</p><h2 id="conversation-title">The team has your note.</h2><p>{demo ? 'This conversation stayed in this browser. Nothing was submitted, saved, or emailed. Refresh the page to clear it.' : 'An operator will follow up at the email you provided. Nothing has been charged. Partnership details wait for a written agreement.'}</p><p>You are not opted into marketing. This note does not share candidate information, and there is no directory of people to browse.</p></div> : <>
          <p className="eyebrow">START A CONVERSATION</p>
          <h2 id="conversation-title">Tell the team you would like to talk.</h2>
          <button ref={toggleRef} type="button" className="button primary partner-disclosure" aria-expanded={open} aria-controls="partner-conversation-form" onClick={toggleForm}>{open ? 'Hide conversation form' : 'Start a conversation'}</button>
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
              <p role="alert">{message}</p>
              <button className="button primary" disabled={busy}>{busy ? 'Sending…' : 'Start a conversation'}</button>
            </form>
          </div>
        </>}
      </section>
    </main>
  </div>;
}

function CommunityLink({ children }: { children: React.ReactNode }) {
  const demo = useOpenDemo();
  if (demo) return <Link href="/find-your-path">{children}</Link>;
  return <a href={tenant.communityUrl} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
