'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { sectors } from '@/lib/sector-taxonomy';
import './sector-filter.css';

export default function SectorFilter({ value, onChange, onApply, label = 'Sector', inline = false }: {
  value: string[]; onChange: (value: string[]) => void; onApply?: () => void; label?: string; inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  const matches = sectors.filter(sector => sector.toLowerCase().includes(query.trim().toLowerCase()));
  const summary = value.length === 0 ? 'All sectors' : value.length === 1 ? value[0] : value.length + ' sectors selected';
  return <div className={inline ? 'sector-filter sector-filter-inline' : 'sector-filter'} ref={root}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
      }
    }}>
    <span id={id + '-label'} className="sector-filter-label">{label}</span>
    <button ref={trigger} type="button" className="sector-trigger" aria-labelledby={id + '-label ' + id + '-value'}
      aria-expanded={open} aria-controls={id + '-panel'} onClick={() => { setQuery(''); setOpen(!open); }}>
      <span id={id + '-value'}>{summary}</span>
      <span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
    </button>
    {open && <div id={id + '-panel'} className="sector-panel">
      <label className="sector-search-label">Search sectors
        <input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/>
      </label>
      <fieldset className="sector-options">
        <legend>Choose sectors</legend>
        {matches.map(sector => <label key={sector}>
          <input type="checkbox" checked={value.includes(sector)} onChange={event =>
            onChange(event.target.checked ? [...value, sector] : value.filter(item => item !== sector))}/>
          <span>{sector}</span>
        </label>)}
        {!matches.length && <p>No matching sectors.</p>}
      </fieldset>
      <div className="sector-footer">
        <button type="button" onClick={() => onChange([])}>Clear sectors</button>
        <button type="button" onClick={() => { close(); onApply?.(); }}>Done</button>
      </div>
    </div>}
  </div>;
}
