import { providerLetters } from '@/public/atlas-assets/provider-alphabet.js';
import './provider-alphabet.css';

export default function ProviderAlphabet({ active, available, onChange }: {
  active: string; available: Set<string>; onChange: (letter: string) => void;
}) {
  return <div className="provider-alphabet" role="group" aria-label="Browse providers by letter">
    {['All', ...providerLetters.filter(letter => letter !== '#' || available.has('#'))].map(letter =>
      <button key={letter} type="button" aria-pressed={active === letter}
        disabled={letter !== 'All' && !available.has(letter)} onClick={() => onChange(letter)}>{letter}</button>)}
  </div>;
}
