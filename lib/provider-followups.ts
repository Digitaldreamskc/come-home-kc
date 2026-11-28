export const providerStages = [
  ['identified','Potential resource identified'],
  ['staff_review','Staff review'],
  ['introduction_proposed','Introduction proposed'],
  ['permission_received','Permission received'],
  ['introduction_made','Introduction made'],
  ['meeting_occurred','Meeting occurred'],
  ['opportunity_developed','Opportunity developed'],
  ['confirmed_outcome','Confirmed outcome'],
] as const;

export type CaseProvider = { id: string; name: string; dataset: 'atlas' | 'ecosystem' };
export type ProviderOwner = { id: string; label: string };
export type ProviderFollowup = {
  id: string; case_id: string; dataset: CaseProvider['dataset']; provider_id: string; source_url: string;
  source_checked_at: string; rationale: string; owner_id: string | null; next_action: string; due_on: string; stage: string;
  history: { id: number; stage: string; evidence: string | null; recorded_at: string }[];
};
