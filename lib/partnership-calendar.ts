export const partnershipTimeZone = 'America/Chicago';

export type PartnershipCalendarEntry = {
  id: string;
  date: string;
  title: string;
  kind: 'Agreement' | 'Review' | 'Commitment' | 'Inside KC' | 'Team task' | 'Follow-up';
  startsAt?: string;
};

const chicagoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: partnershipTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const displayDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
});
const displayTime = new Intl.DateTimeFormat('en-US', {
  timeZone: partnershipTimeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

export function calendarDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return null;
  const day = new Date(value + 'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().startsWith(value) ? day : null;
}

export function partnershipDate(value: Date | string) {
  if (typeof value === 'string' && calendarDay(value)) return value;
  const instant = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(instant.getTime())) return '';
  const parts = chicagoDate.formatToParts(instant);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function formatPartnershipDate(value: string) {
  const day = calendarDay(value);
  return day ? displayDate.format(day) : value;
}

export function formatPartnershipTime(value: string) {
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) ? displayTime.format(instant) : '';
}

export function monthStart(year: number, month: number) {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`;
}

export function calendarMonth(year: number, month: number) {
  const first = calendarDay(monthStart(year, month))!;
  const leading = first.getUTCDay();
  const days = [];
  for (const date = new Date(first); date.getUTCMonth() === month; date.setUTCDate(date.getUTCDate() + 1)) {
    days.push(date.toISOString().slice(0, 10));
  }
  return { leading, days };
}

export function googleCalendarDay(date: string) {
  const day = calendarDay(date);
  return day ? `https://calendar.google.com/calendar/r/day/${day.getUTCFullYear()}/${day.getUTCMonth() + 1}/${day.getUTCDate()}` : undefined;
}

export function googleCalendarReminder(entry: PartnershipCalendarEntry) {
  const next = calendarDay(entry.date);
  if (!next || entry.startsAt) return undefined;
  next.setUTCDate(next.getUTCDate() + 1);
  if (next.getUTCFullYear() > 9999) return undefined;
  // Draft only. Keep workspace record text, case details and participant data out of the URL.
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    dates: `${entry.date.replaceAll('-', '')}/${next.toISOString().slice(0, 10).replaceAll('-', '')}`,
    text: `Back2KC ${entry.kind.toLowerCase()}`,
  });
  return 'https://calendar.google.com/calendar/r/eventedit?' + params.toString();
}
