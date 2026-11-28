'use client';

import { useId, useMemo, useRef, useState } from 'react';
import {
  calendarDay, calendarMonth, formatPartnershipDate, formatPartnershipTime, googleCalendarDay,
  googleCalendarReminder, monthStart, type PartnershipCalendarEntry,
} from '@/lib/partnership-calendar';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type CalendarProps = {
  entries: PartnershipCalendarEntry[];
  initialDate: string;
  today: string;
  renewal: string;
  initiallyExpanded?: boolean;
};

export default function PartnershipCalendar({
  entries, initialDate, today, renewal, initiallyExpanded = false,
}: CalendarProps) {
  const [selected, setSelected] = useState(initialDate);
  const [query, setQuery] = useState(initialDate);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const agendaHeading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const year = Number(selected.slice(0, 4));
  const month = Number(selected.slice(5, 7)) - 1;

  const byDate = useMemo(() => {
    const dates = new Map<string, PartnershipCalendarEntry[]>();
    for (const entry of entries) {
      if (!calendarDay(entry.date)) continue;
      const items = dates.get(entry.date) ?? [];
      items.push(entry);
      dates.set(entry.date, items);
    }
    for (const items of dates.values()) {
      items.sort((left, right) => (left.startsAt ?? '').localeCompare(right.startsAt ?? '') ||
        left.title.localeCompare(right.title));
    }
    return dates;
  }, [entries]);

  const dayEntries = byDate.get(selected) ?? [];
  const googleDay = googleCalendarDay(selected);

  function pickDay(date: string, focusAgenda = false) {
    if (!calendarDay(date)) return;
    setSelected(date);
    setQuery(date);
    if (focusAgenda) requestAnimationFrame(() => agendaHeading.current?.focus());
  }

  return <section className="partnership-calendar" aria-labelledby={id + '-title'}>
    <div className="partnership-calendar-header">
      <div>
        <h3 id={id + '-title'}>Partnership calendar</h3>
        {renewal && <p>Renewal · {renewal}</p>}
      </div>
      <button type="button" aria-controls={id + '-year'} aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}>
        {expanded ? 'Collapse year view' : 'Expand year view'}
      </button>
    </div>

    <div className="partnership-calendar-toolbar">
      <form className="partnership-calendar-search" onSubmit={event => {
        event.preventDefault();
        pickDay(query, true);
      }}>
        <label htmlFor={id + '-date'}>Find by date</label>
        <div>
          <input id={id + '-date'} type="date" min="0001-01-01" max="9999-12-31" required
            value={query} onChange={event => setQuery(event.target.value)}/>
          <button type="submit">Go to date</button>
        </div>
      </form>
      <div className="partnership-calendar-year-controls" aria-label="Calendar year">
        <button type="button" aria-label="Previous year" disabled={year <= 1}
          onClick={() => pickDay(monthStart(year - 1, month))}>‹</button>
        <strong>{year}</strong>
        <button type="button" aria-label="Next year" disabled={year >= 9999}
          onClick={() => pickDay(monthStart(year + 1, month))}>›</button>
        <button type="button" onClick={() => pickDay(today, true)}>Today</button>
      </div>
    </div>

    <div className="partnership-calendar-months" role="group" aria-label={`Months of ${year}`}>
      {months.map((name, index) => <button type="button" key={name} aria-label={`${name} ${year}`}
        aria-pressed={index === month} onClick={() => pickDay(monthStart(year, index))}>
        {name.slice(0, 3)}
      </button>)}
    </div>

    <div className="partnership-calendar-main">
      <Month year={year} month={month} selected={selected} today={today} byDate={byDate}
        onPick={date => pickDay(date)}/>
      <div className="partnership-calendar-agenda">
        <h4 ref={agendaHeading} tabIndex={-1}>
          <time dateTime={selected}>{formatPartnershipDate(selected)}</time>
        </h4>
        {dayEntries.length ? <ul>
          {dayEntries.map(entry => {
            const reminder = googleCalendarReminder(entry);
            return <li key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{entry.kind}{entry.startsAt && <> · <time dateTime={entry.startsAt}>
                {formatPartnershipTime(entry.startsAt)}
              </time></>}</span>
              {reminder && <a href={reminder} target="_blank" rel="noopener noreferrer"
                aria-label={`Add ${entry.kind.toLowerCase()} reminder to Google Calendar`}>
                Add reminder to Google Calendar
              </a>}
            </li>;
          })}
        </ul> : <p>No partnership items on this date.</p>}
        {googleDay && <a className="partnership-google-calendar" href={googleDay} target="_blank"
          rel="noopener noreferrer">Open date in Google Calendar</a>}
      </div>
    </div>

    <div id={id + '-year'} className="partnership-calendar-year" hidden={!expanded}>
      {expanded && <>
        <p>Select a marked date to see its items.</p>
        <div className="partnership-calendar-year-grid">
          {months.map((name, index) => <Month key={name} year={year} month={index} selected={selected}
            today={today} byDate={byDate} onPick={date => pickDay(date, true)} compact/>)}
        </div>
      </>}
    </div>
  </section>;
}

function Month({ year, month, selected, today, byDate, onPick, compact = false }: {
  year: number; month: number; selected: string; today: string; compact?: boolean;
  byDate: Map<string, PartnershipCalendarEntry[]>; onPick: (date: string) => void;
}) {
  const { leading, days } = calendarMonth(year, month);
  const title = `${months[month]} ${year}`;
  return <div className={compact ? 'partnership-calendar-month compact' : 'partnership-calendar-month'}
    role="group" aria-label={title}>
    <h4>{compact ? months[month] : title}</h4>
    <div className="partnership-calendar-days">
      {weekdays.map(day => <span key={day} title={day} aria-hidden="true">{day.slice(0, 2)}</span>)}
      {Array.from({ length: leading }, (_, index) => <span key={index} aria-hidden="true"/>)}
      {days.map(date => {
        const count = byDate.get(date)?.length ?? 0;
        const number = Number(date.slice(8));
        return compact && !count ? <span key={date} aria-hidden="true">{number}</span> :
          <button key={date} type="button" onClick={() => onPick(date)}
            aria-label={`${formatPartnershipDate(date)}${count ? `, ${count} ${count === 1 ? 'item' : 'items'}` : ''}`}
            aria-pressed={selected === date} aria-current={today === date ? 'date' : undefined}
            data-has-items={count > 0 ? 'true' : undefined}>
            {number}
          </button>;
      })}
    </div>
  </div>;
}
