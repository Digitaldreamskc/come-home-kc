'use client';

import { useState } from 'react';
import SectorFilter from '@/components/sector-filter';

export default function IntelligenceSearch({ agreement, query, sectors }: { agreement?: string; query?: string; sectors: string[] }) {
  const [selected, setSelected] = useState(sectors);
  return <form method="get" action="/partnerships">
    <input type="hidden" name="view" value="intelligence"/>
    {agreement && <input type="hidden" name="agreement" value={agreement}/>}
    <label>Search research and resources<input name="q" type="search" defaultValue={query}/></label>
    <SectorFilter label="Documented sector" value={selected} onChange={setSelected}/>
    {selected.map(sector => <input key={sector} type="hidden" name="sector" value={sector}/>)}
    <button>Search</button>
  </form>;
}
