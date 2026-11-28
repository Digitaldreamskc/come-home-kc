import assert from 'node:assert/strict';
import test from 'node:test';
import { documentedSectors, matchesSectors, sectors } from '../lib/sector-taxonomy';
import { applicationSchema } from '../lib/ecosystem-application-schema';

const application = {
  name: 'Fictional Validation Studio', programName: '',
  category: 'Mentoring', website: 'https://example.com/fictional-validation',
  firstName: 'Fictional', lastName: 'Tester', phone: '816-555-0101', contactEmail: 'private@example.com',
  address1: '100 Fictional Way', city: 'Kansas City', state: 'MO', zip: '64101',
  quickDescription: 'Business mentoring for validation.', geographicRestrictions: 'KC metro',
  primaryType: 'Main Street', primaryStage: 'Idea / inception',
  selections: { 'Business type|Main Street': 'offer', 'Business stage|Idea / inception': 'specialty' },
  allIndustries: true, sectors: ['SaaS', 'Business Services'], consent: true, website_trap: '',
};

test('the shared taxonomy supports multiple sectors and preserves all-industry coverage', () => {
  assert.equal(new Set(sectors).size, 17);
  assert.deepEqual(documentedSectors('Technology, Healthcare, Boutique niche'), ['Information Technology','Healthcare']);
  assert.equal(matchesSectors(['SaaS', 'Healthcare'], ['Healthcare','Business Services']), true);
  assert.equal(matchesSectors([], ['FinTech'], true), true);
  assert.equal(matchesSectors([], ['FinTech']), false);
});

test('intake accepts supported sectors and keeps applicant contact distinct from public contact', () => {
  const entry = applicationSchema.parse(application);
  assert.deepEqual(entry.sectors, ['SaaS', 'Business Services']);
  assert.equal(entry.contactEmail, 'private@example.com');
  assert.equal(entry.publicEmail, '');
  assert.equal(applicationSchema.safeParse({...application, sectors:['Unclassified']}).success, false);
  assert.equal(applicationSchema.safeParse({...application, selections:{}}).success, false);
  assert.equal(applicationSchema.safeParse({...application, consent:false}).success, false);
});
