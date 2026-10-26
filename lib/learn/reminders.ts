/**
 * Daily reminder as an iCalendar file: the learner adds it to their own
 * calendar app. We never send notifications ourselves (no push server, no
 * contact data). Off by default; for under-16s a grown-up turns it on.
 */

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function reminderIcs({ time, timeZone, title, url, start = new Date() }: { time: string; timeZone: string; title: string; url: string; start?: Date }): string {
  const [hh, mm] = time.split(':')
  const day = start.toISOString().slice(0, 10).replace(/-/g, '')
  const stamp = start
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RoboEasy//Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:roboeasy-daily-${day}@roboeasy`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${timeZone}:${day}T${hh}${mm}00`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escape(title)}`,
    `URL:${url}`,
    `DESCRIPTION:${escape(url)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${escape(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
