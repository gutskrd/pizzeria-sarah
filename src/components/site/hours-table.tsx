import { upcomingExceptions, weekRows, type Schedule } from '@/lib/opening-hours';

export function HoursTable({ schedule, now, tone = 'light' }: { schedule: Schedule; now: Date; tone?: 'light' | 'dark' }) {
  const rows = weekRows(schedule, now);
  const exceptions = upcomingExceptions(schedule, now);
  const muted = tone === 'dark' ? 'text-paper/70' : 'text-muted';
  const line = tone === 'dark' ? 'border-white/15' : 'border-line';

  return (
    <div>
      <table className="w-full border-collapse text-[0.98rem]">
        <caption className="sr-only">Openingstijden per dag</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.weekday} className={`border-b ${line} ${row.isToday ? 'font-semibold' : ''}`}>
              <th scope="row" className="py-2.5 pr-4 text-left align-top font-[inherit]">
                {row.name}
                {row.isToday && (
                  <span className={`ml-2 text-xs font-semibold uppercase tracking-wider ${tone === 'dark' ? 'text-[#f0b48a]' : 'text-tomato'}`}>vandaag</span>
                )}
              </th>
              <td className="py-2.5 text-right align-top tabular-nums">
                {row.hours}
                {row.note && <span className={`block text-sm font-normal ${muted}`}>{row.note}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {exceptions.length > 0 && (
        <div className="mt-6">
          <h3 className="font-sans text-sm font-semibold uppercase tracking-wider">Afwijkende openingstijden</h3>
          <ul className="mt-2 space-y-2">
            {exceptions.map((e) => (
              <li key={`${e.when}-${e.label}`} className="flex flex-wrap justify-between gap-x-4 text-[0.95rem]">
                <span>
                  {e.when} <span className={muted}>· {e.label}</span>
                </span>
                <span className="tabular-nums font-medium">{e.hours}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
