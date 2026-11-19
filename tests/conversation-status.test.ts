import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conversationStatuses, mapConversationStatus } from '../lib/conversation-status';

const migration = readFileSync(new URL('../supabase/migrations/20261119193000_founding_partner_conversations.sql', import.meta.url), 'utf8');

test('conversation statuses replace proposal, committed and active without rewriting unknown values', () => {
  assert.deepEqual([...conversationStatuses], ['Prospect', 'Contacted', 'Conversation', 'Following up', 'Partner', 'Paused']);
  assert.equal(mapConversationStatus('Proposal'), 'Following up');
  assert.equal(mapConversationStatus('Committed'), 'Partner');
  assert.equal(mapConversationStatus('Active'), 'Partner');
  assert.equal(mapConversationStatus('Discovery'), 'Conversation');
  for (const status of ['Prospect', 'Contacted', 'Conversation', 'Following up', 'Partner', 'Paused', 'Erased', 'PRIVATE_SENTINEL']) {
    assert.equal(mapConversationStatus(status), status);
  }
  for (const [from, to] of [['Proposal', 'Following up'], ['Committed', 'Partner'], ['Active', 'Partner'], ['Discovery', 'Conversation']] as const) {
    assert.match(migration, new RegExp(`when '${from}' then '${to}'`));
  }
  assert.match(migration, /inquirer_name='',inquirer_email='',inquirer_role='',organization_name='',message='',contact_consent=false/);
  assert.equal(migration.includes('\u2014'), false);
});
