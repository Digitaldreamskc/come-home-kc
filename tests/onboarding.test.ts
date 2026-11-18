import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingIntent,onboardingDestination,safeAuthDestination,emailConfirmed} from '../lib/onboarding';
test('onboarding routing accepts only known non-privileged destinations',()=>{assert.equal(onboardingIntent('admin'),'talent');assert.equal(onboardingDestination('employer'),'/portal?view=employer');for(const next of ['https://evil.test','//evil.test','/admin','/portal?role=admin'])assert.equal(safeAuthDestination(next),'/portal');assert.equal(safeAuthDestination('/reset-password'),'/reset-password');assert.equal(safeAuthDestination('/portal?view=employer'),'/portal?view=employer');});

test('introduction destination survives auth without accepting external redirects',()=>{const id='95000000-0000-4000-8000-000000000001';assert.equal(safeAuthDestination('/portal?job='+id),'/portal?view=profile&job='+id+'#request-introduction');for(const next of ['/portal/evil','/portal?job=bad','/portal?next=https://evil.test','/portal\\evil'])assert.ok(!safeAuthDestination(next).includes('evil'));});

test('unconfirmed users cannot enter the private session boundary',()=>{assert.equal(emailConfirmed(null),false);assert.equal(emailConfirmed({email_confirmed_at:null}),false);assert.equal(emailConfirmed({}),false);assert.equal(emailConfirmed({email_confirmed_at:'2026-11-18T00:00:00Z'}),true);});
