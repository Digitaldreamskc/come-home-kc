import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarDay, calendarMonth, formatPartnershipDate, formatPartnershipTime,
  googleCalendarDay, googleCalendarReminder, partnershipDate, type PartnershipCalendarEntry,
} from '../lib/partnership-calendar';
import { safeAuthDestination } from '../lib/onboarding';

test('calendar months preserve date-only deadlines and place experiences in Central time', () => {
  assert.equal(calendarDay('2027-02-29'), null);
  assert.equal(calendarMonth(2028, 1).days.length, 29);
  assert.equal(calendarMonth(2027, 0).leading, 5);
  assert.equal(calendarMonth(2027, 11).days.at(-1), '2027-12-31');
  assert.equal(partnershipDate('2027-03-12'), '2027-03-12');
  assert.equal(partnershipDate('2027-03-13T01:00:00Z'), '2027-03-12');
  assert.equal(formatPartnershipDate('2027-03-12'), 'Mar 12, 2027');
  assert.equal(formatPartnershipTime('2027-03-13T01:00:00Z'), '7:00 PM CST');
});

test('Google Calendar opens the chosen day and creates a private-data-free all-day draft', () => {
  const entry: PartnershipCalendarEntry = {
    id: 'private-id', date: '2027-12-31', title: 'Private client follow-up', kind: 'Follow-up',
  };
  assert.equal(googleCalendarDay(entry.date), 'https://calendar.google.com/calendar/r/day/2027/12/31');
  const reminder = new URL(googleCalendarReminder(entry)!);
  assert.equal(reminder.origin, 'https://calendar.google.com');
  assert.equal(reminder.searchParams.get('action'), 'TEMPLATE');
  assert.equal(reminder.searchParams.get('dates'), '20271231/20280101');
  assert.equal(reminder.searchParams.get('text'), 'Back2KC follow-up');
  assert.equal(reminder.searchParams.has('details'), false);
  assert.equal(googleCalendarReminder({ ...entry, startsAt: '2027-12-31T16:00:00Z' }), undefined);
  assert.equal(googleCalendarDay('2027-02-31'), undefined);
});

test('calendar sign-in preserves trusted workspace URLs', () => {
  const path = '/partnerships?view=calendar';
  const agreement = '95000000-0000-4000-8000-000000000001';
  assert.equal(safeAuthDestination(path), path);
  assert.equal(safeAuthDestination(path + '&agreement=' + agreement), path + '&agreement=' + agreement);
  assert.equal(safeAuthDestination(path + '&next=https://example.com'), '/portal');
  assert.equal(safeAuthDestination('/partnerships?view=calendar&agreement=invalid'), '/portal');
});
