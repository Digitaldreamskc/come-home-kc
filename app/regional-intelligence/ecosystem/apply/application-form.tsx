'use client';

import { useActionState, useState } from 'react';
import { businessTypes, businessStages, allGroups } from '@/lib/ecosystem-application';
import { applicationCategories } from '@/lib/ecosystem-application-schema';
import SectorFilter from '@/components/sector-filter';
import { submitApplication } from './actions';

const organizationFields = [
  ['name', 'Organization name', 'text', true],
  ['programName', 'Program name (if applicable)', 'text', false],
  ['website', 'Official website (HTTPS)', 'url', true],
  ['linkedin', 'LinkedIn page', 'url', false],
  ['facebook', 'Facebook page', 'url', false],
  ['x', 'X page', 'url', false],
  ['instagram', 'Instagram page', 'url', false],
] as const;
const contactFields = [
  ['firstName', 'First name', 'text', true],
  ['lastName', 'Last name', 'text', true],
  ['contactEmail', 'Email for application review', 'email', true],
  ['phone', 'Phone for application review', 'tel', true],
  ['extension', 'Phone extension', 'text', false],
  ['address1', 'Street address', 'text', true],
  ['address2', 'Suite or unit', 'text', false],
  ['city', 'City', 'text', true],
  ['state', 'State abbreviation', 'text', true],
  ['zip', 'ZIP code', 'text', true],
  ['publicEmail', 'Public email (optional)', 'email', false],
  ['publicPhone', 'Public phone (optional)', 'tel', false],
] as const;

export default function ApplicationForm() {
  const [message, submit, pending] = useActionState(submitApplication, '');
  const [sectors, setSectors] = useState<string[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState({ allIndustries: false, consent: false });

  if (message === 'submitted') return <p role="status">Application received. Staff will review it before any profile is published.</p>;

  function bind(key: string) {
    return { name: key, value: values[key] ?? '', onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues(current => ({ ...current, [key]: event.target.value })) };
  }

  return <form action={submit} className="resource-application">
    <fieldset><legend>Organization and program</legend>
      <div className="application-fields">
        {organizationFields.map(([key, label, type, required]) => <label key={key}>{label}<input {...bind(key)} type={type} maxLength={type === 'url' ? 500 : key === 'programName' ? 150 : 200} required={required}/></label>)}
        <label>Primary type of support<select {...bind('category')} required><option value="">Choose a category</option>{applicationCategories.map(category => <option key={category}>{category}</option>)}</select></label>
      </div>
      <label>Directory description<textarea {...bind('quickDescription')} required maxLength={250} rows={3}/></label>
      <label>Additional program information<textarea {...bind('fullDescription')} maxLength={5000} rows={4}/></label>
      <label>Geographic service area and eligible locations<textarea {...bind('geographicRestrictions')} required maxLength={1500} rows={2}/></label>
      <label>Logo (PNG, JPEG or GIF, up to 1 MB)<input type="file" name="logo" accept="image/png,image/jpeg,image/gif"/></label>
    </fieldset>
    <fieldset><legend>Contact and location</legend>
      <p>Staff use your application contact details for review. Add public contact details only if you want them included in the directory.</p>
      <div className="application-fields">
        {contactFields.map(([key, label, type, required]) => <label key={key}>{label}<input {...bind(key)} type={type} required={required}
          maxLength={type === 'email' ? 254 : type === 'tel' ? 40 : key === 'state' ? 2 : key === 'zip' ? 20 : key === 'extension' ? 12 : 200}
          pattern={key === 'state' ? '[A-Z]{2}' : undefined}/></label>)}
      </div>
    </fieldset>
    <fieldset><legend>Who you serve</legend>
      <div className="application-fields">
        <label>Primary business type<select {...bind('primaryType')} required><option value="">Choose a type</option>{businessTypes.map(type => <option key={type}>{type}</option>)}</select></label>
        <label>Primary business stage<select {...bind('primaryStage')} required><option value="">Choose a stage</option>{businessStages.map(stage => <option key={stage}>{stage}</option>)}</select></label>
      </div>
      <label className="application-check"><input type="checkbox" name="allIndustries" checked={flags.allIndustries} onChange={event => setFlags({ ...flags, allIndustries: event.target.checked })}/>We serve businesses in all industries</label>
      <SectorFilter label="Documented sector specialties" value={sectors} onChange={setSectors}/>
      {sectors.map(sector => <input key={sector} type="hidden" name="sectors" value={sector}/>)}
      <label>Other industry specialties<textarea {...bind('sectorSpecialties')} maxLength={1500} rows={2}/></label>
    </fieldset>
    <fieldset><legend>Business needs and services</legend>
      <p>Select all that apply. Mark the primary business type and stage you chose above.</p>
      {Object.entries(allGroups).map(([group, options]) => <details key={group} open={group === 'Business type' || group === 'Business stage' ? true : undefined}>
        <summary>{group}</summary>
        <div className="application-fields">{options.map(option => {
          const key = 'selection:' + group + '|' + option;
          return <label key={key}>{option}<select name={key} value={selections[key] ?? ''} onChange={event => setSelections(current => ({ ...current, [key]: event.target.value }))}>
            <option value="">Choose if offered</option><option value="offer">Offered</option><option value="specialty">Specialty</option>
          </select></label>;
        })}</div>
      </details>)}
    </fieldset>
    <div hidden aria-hidden="true"><input name="website_trap" tabIndex={-1} autoComplete="off"/></div>
    <label className="application-check"><input name="consent" type="checkbox" required checked={flags.consent} onChange={event => setFlags({ ...flags, consent: event.target.checked })}/>I am authorized to submit this information and agree that staff may publish the profile details I marked for the directory.</label>
    {message && <p role="alert">{message}</p>}
    <button type="submit" className="ecosystem-visit" disabled={pending}>{pending ? 'Submitting…' : 'Submit application'}</button>
  </form>;
}
