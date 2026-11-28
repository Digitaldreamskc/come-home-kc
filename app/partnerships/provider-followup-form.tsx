'use client';

import { useState } from 'react';
import { saveProviderFollowup } from './provider-followup';
import { providerStages, type CaseProvider, type ProviderFollowup, type ProviderOwner } from '@/lib/provider-followups';

export default function ProviderFollowupForm({ caseId, providers, owners, followup }:
  { caseId: string; providers: CaseProvider[]; owners: ProviderOwner[]; followup?: ProviderFollowup }) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState(followup?.stage ?? 'identified');
  const choices = providers.filter(provider => provider.name.toLowerCase().includes(query.trim().toLowerCase()));
  const stageIndex = providerStages.findIndex(([key]) => key === followup?.stage);
  return <form action={saveProviderFollowup}>
    <input type="hidden" name="case" value={caseId}/>
    <input type="hidden" name="followup" value={followup?.id ?? ''}/>
    {followup ? <input type="hidden" name="provider" value=""/> : <>
      <label>Search providers<input type="search" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <label>Canonical provider<select name="provider" required key={query} defaultValue="">
        <option value="" disabled>Choose a provider</option>
        {choices.map(provider => <option value={provider.dataset + ':' + provider.id} key={provider.dataset + provider.id}>
          {provider.name} · {provider.dataset === 'atlas' ? 'Capital' : 'Business support'}
        </option>)}
      </select></label>
      {!choices.length && <p role="status">No matching providers.</p>}
      <label>Why might this resource fit?<textarea name="reason" required maxLength={1000}/></label>
    </>}
    {followup && <input type="hidden" name="reason" value=""/>}
    <label>Follow-up owner<select name="owner" required defaultValue={followup?.owner_id ?? ''}>
      <option value="" disabled>Assign a staff member</option>
      {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.label}</option>)}
    </select></label>
    <label>Next action<input name="nextAction" required maxLength={500} defaultValue={followup?.next_action}/></label>
    <label>Follow-up date<input name="dueDate" type="date" required defaultValue={followup?.due_on}/></label>
    {followup ? <>
      <label>Progress<select name="stage" value={stage} onChange={event => setStage(event.target.value)}>
        {providerStages.slice(stageIndex, stageIndex + 2).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select></label>
      <label>{stage === 'permission_received' ? 'Permission evidence and approved sharing scope' : 'Progress or outcome evidence'}<textarea name="evidence" maxLength={3000} required={stage !== followup.stage}/></label>
    </> : <><input type="hidden" name="stage" value="identified"/><input type="hidden" name="evidence" value=""/></>}
    <button>{followup ? 'Save follow-up progress' : 'Create provider follow-up'}</button>
  </form>;
}
