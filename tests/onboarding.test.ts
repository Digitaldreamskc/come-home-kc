import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingIntent,onboardingDestination,safeAuthDestination} from '../lib/onboarding';
test('onboarding routing accepts only known non-privileged destinations',()=>{assert.equal(onboardingIntent('admin'),'talent');assert.equal(onboardingDestination('employer'),'/portal?view=employer');for(const next of ['https://evil.test','//evil.test','/admin','/portal?role=admin'])assert.equal(safeAuthDestination(next),'/portal');assert.equal(safeAuthDestination('/reset-password'),'/reset-password');assert.equal(safeAuthDestination('/portal?view=employer'),'/portal?view=employer');});
