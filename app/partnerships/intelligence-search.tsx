'use client';

import { useRef, useState } from 'react';
import SectorFilter from '@/components/sector-filter';

export default function IntelligenceSearch({ agreement, query, sectors }: {
  agreement?: string; query?: string; sectors: string[];
}) {
  const [selected, setSelected] = useState(sectors);
  const form = useRef<HTMLFormElement>(null);
  return <form ref={form} className="atlas-search intelligence-search" method="get" action="/partnerships">
    <input type="hidden" name="view" value="intelligence"/>
    {agreement && <input type="hidden" name="agreement" value={agreement}/>}
    <div className="intelligence-search-controls">
      <label>Search research and resources<input name="q" type="search" defaultValue={query}/></label>
      <SectorFilter inline label="Documented sector" value={selected} onChange={setSelected}
        onApply={() => form.current?.requestSubmit()}/>
    </div>
    {selected.map(sector => <input key={sector} type="hidden" name="sector" value={sector}/>)}
    <button type="submit">Search</button>
  </form>;
}
