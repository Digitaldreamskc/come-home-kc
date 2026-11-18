import test from 'node:test';
import assert from 'node:assert/strict';
import {requestTitle,requestStatus,requestDate} from '../lib/request-presentation';
import {existingAccountError,publicAuthError} from '../lib/auth-messages';
test('request history uses plain labels and the Kansas City date',()=>{assert.equal(requestTitle('employer'),'Employer verification');assert.equal(requestStatus('pending'),'Awaiting review');assert.equal(requestStatus('requested'),'Awaiting review');assert.equal(requestDate('2026-11-19T02:00:00Z'),'Sent Nov 18');assert.equal(requestDate('invalid'),'Sent date unavailable');});
test('authentication messages do not echo account-existence errors',()=>{assert.ok(existingAccountError({code:'user_already_exists'}));assert.ok(existingAccountError({message:'This email is already registered.'}));assert.doesNotMatch(publicAuthError({message:'someone@example.test exists'}),/someone|exists/);});
