'use client';

import { useState } from 'react';
import ProviderAlphabet from '@/components/provider-alphabet';
import type { DiscoveryEntry } from '@/lib/atlas-discovery';
import { providerAlphabet, providerInitial } from '@/public/atlas-assets/provider-alphabet.js';

export default function IntelligenceCapital({providers, searching}: {providers: DiscoveryEntry[]; searching: boolean}) {
  const [letter,setLetter] = useState('');
  const { active, available } = providerAlphabet(providers, letter, searching);
  const visible = active === 'All' ? providers : providers.filter(provider => providerInitial(provider.name) === active);
  if (!providers.length) return <p>No matching capital providers.</p>;
  return <>
    <ProviderAlphabet active={active} available={available} onChange={setLetter}/>
    <p role="status">{visible.length === providers.length ? `${visible.length} matching providers` :
      `Showing ${visible.length} of ${providers.length} matching providers`}</p>
    <div className="intelligence-capital-cards">
      {visible.map(provider => {
        const sectors = [...new Set([provider.sector,...provider.sectors].filter(Boolean))];
        const facts = [
          ['Stage', provider.stage], ['Sector', sectors.join(', ')], ['Check size', provider.check],
        ].filter(([, value]) => value);
        return <article key={provider.id} className="intelligence-capital-card">
          <h4>{provider.name}</h4>
          <p>{[provider.type,[provider.city,provider.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
          {provider.focus && <p>{provider.focus}</p>}
          {!!facts.length && <dl>{facts.map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
          <div className="intelligence-capital-links">
            {provider.website?.startsWith('https://') && <a className="button primary" href={provider.website}
              target="_blank" rel="noopener noreferrer">Visit website</a>}
            {provider.source?.startsWith('https://') && <a href={provider.source}
              target="_blank" rel="noopener noreferrer">Source evidence</a>}
          </div>
        </article>;
      })}
    </div>
  </>;
}
