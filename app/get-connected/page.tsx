import Link from 'next/link';
import {notFound} from 'next/navigation';
import {EditorialPage} from '@/components/editorial';
import {tenant} from '@/lib/tenant-config';
import WelcomeForm from './welcome-form';

export const metadata = {title: 'Get connected | Come Home KC'};

export default function GetConnected() {
  if (!tenant.welcomeFormUrl) notFound();
  return <EditorialPage><section className="editor-section">
    <p className="partner-eyebrow">Come Home KC</p>
    <h1>Get connected</h1>
    <p className="partner-intro">What brings you to Kansas City? Choose where you’d like to start.</p>
    <div className="editor-grid">
      <article className="editor-card"><h2>I’m settling in</h2><p>Tell the New2KC team about your move and the local connections you’re looking for.</p><a href="#welcome">Start the welcome questionnaire</a></article>
      <article className="editor-card"><h2>I’m exploring a career move</h2><p>Create a private talent profile or browse Kansas City employers and roles.</p><Link href="/portal?view=profile">Start my private profile</Link><p><Link href="/marketplace">Browse opportunities</Link></p></article>
      <article className="editor-card"><h2>I’m getting to know KC</h2><p>Explore the region at your own pace with New2KC.</p><a href={tenant.communityUrl}>Open New2KC Explorer</a></article>
    </div>
  </section><section className="editor-section" id="welcome">
    <h2>New2KC welcome questionnaire</h2><p>Share your interests and choose your follow-up preferences in the New2KC Google Form.</p>
    <WelcomeForm url={tenant.welcomeFormUrl}/>
  </section></EditorialPage>;
}
