import { asc, gte, inArray } from 'drizzle-orm';
import { HoursEditor, type AdminException } from '@/components/admin/hours/hours-editor';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';
import { todayInAmsterdam } from '@/lib/format';
import { normalizeTime, type WeekDay } from '@/lib/opening-hours';

export const metadata = { title: 'Openingstijden – Beheer' };

export default async function AdminHoursPage() {
  await requireAdmin();
  const today = todayInAmsterdam();
  const d = db();
  const [days, periods, exceptions] = await Promise.all([
    d.select().from(schema.openingDays).orderBy(asc(schema.openingDays.weekday)),
    d.select().from(schema.openingPeriods).orderBy(asc(schema.openingPeriods.opensAt)),
    d.select().from(schema.openingExceptions).where(gte(schema.openingExceptions.endsOn, today)).orderBy(asc(schema.openingExceptions.startsOn)),
  ]);
  const exceptionPeriods = exceptions.length
    ? await d
        .select()
        .from(schema.openingExceptionPeriods)
        .where(
          inArray(
            schema.openingExceptionPeriods.exceptionId,
            exceptions.map((e) => e.id),
          ),
        )
        .orderBy(asc(schema.openingExceptionPeriods.opensAt))
    : [];

  const weekly: WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    note: days.find((x) => x.weekday === weekday)?.note ?? '',
    periods: periods.filter((p) => p.weekday === weekday).map((p) => ({ opens: normalizeTime(p.opensAt), closes: normalizeTime(p.closesAt) })),
  }));
  const list: AdminException[] = exceptions.map((e) => ({
    id: e.id,
    startsOn: e.startsOn,
    endsOn: e.endsOn,
    isClosed: e.isClosed,
    label: e.label,
    periods: exceptionPeriods.filter((p) => p.exceptionId === e.id).map((p) => ({ opens: normalizeTime(p.opensAt), closes: normalizeTime(p.closesAt) })),
  }));
  return <HoursEditor weekly={weekly} exceptions={list} today={today} />;
}
