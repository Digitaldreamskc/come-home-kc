import Link from 'next/link';
import { EditorialPage, RegionalHero } from '@/components/editorial';
import './intelligence.css';

export default function RegionalIntelligence() {
  return <EditorialPage>
    <RegionalHero label="Regional intelligence" title="Understand the market. Discover what’s possible.">
      <p className="partner-intro">Explore the research, capital resources and economic history shaping Kansas City.</p>
      <div className="partner-hero-actions"><Link className="partner-button partner-primary" href="/atlas">Explore the full KC Capital Atlas</Link><Link className="partner-button partner-secondary" href="/marketplace?category=resources">Find regional resources</Link></div>
    </RegionalHero>
    <section className="editor-section intelligence-section"><h2>Explore the landscape</h2>
      <div className="intelligence-grid">
        <article><h3>Capital landscape</h3><p>Discover source-linked provider profiles and historical capital research.</p><Link href="/regional-intelligence/capital">Explore capital landscape</Link></article>
        <article><h3>Industry landscape</h3><p>Discover regional employers.</p><Link href="/marketplace?category=employers">Explore employers</Link></article>
        <article><h3>Entrepreneurial ecosystem</h3><p>Find business support and funding programs.</p><Link href="/regional-intelligence/ecosystem">Explore entrepreneurial ecosystem</Link></article>
        <article><h3>Kansas City’s economic story</h3><p>Explore documented milestones from the Atlas.</p><Link href="/atlas#story">Explore history</Link></article>
      </div>
    </section>
  </EditorialPage>;
}
