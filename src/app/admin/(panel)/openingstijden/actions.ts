'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { adminAction, UserError } from '@/lib/admin/action';
import { invalidatePublicContent } from '@/lib/content/cache';
import { db, schema } from '@/lib/db';
import { formatCalendarDate } from '@/lib/format';
import { validatePeriods } from '@/lib/opening-hours';
import { logActivity } from '@/lib/security/events';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Vul een geldige tijd in, bijvoorbeeld 16:00.');
const period = z.object({ opens: time, closes: time });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Kies een datum.');

export const saveWeeklyHours = adminAction(
  z.object({
    days: z
      .array(
        z.object({
          weekday: z.number().int().min(1).max(7),
          periods: z.array(period).max(4, 'Maximaal 4 tijdvakken per dag.'),
          note: z.string().trim().max(120, 'Maximaal 120 tekens.'),
        }),
      )
      .length(7),
  }),
  async ({ days }, ctx) => {
    for (const day of days) {
      const problem = validatePeriods(day.periods);
      if (problem) throw new UserError(problem, { [`day-${day.weekday}`]: problem });
    }
    await db().transaction(async (tx) => {
      await tx.delete(schema.openingPeriods);
      for (const day of days) {
        await tx
          .insert(schema.openingDays)
          .values({ weekday: day.weekday, note: day.note })
          .onConflictDoUpdate({ target: schema.openingDays.weekday, set: { note: day.note } });
        if (day.periods.length) {
          await tx.insert(schema.openingPeriods).values(day.periods.map((p) => ({ weekday: day.weekday, opensAt: p.opens, closesAt: p.closes })));
        }
      }
    });
    await logActivity(ctx.user.id, 'openingstijden', 'Openingstijden gewijzigd');
    invalidatePublicContent();
    return { ok: true, message: 'Openingstijden bijgewerkt.' };
  },
);

export const saveException = adminAction(
  z
    .object({
      id: z.uuid().optional(),
      startsOn: date,
      endsOn: date,
      isClosed: z.boolean(),
      label: z.string().trim().min(1, 'Geef een korte omschrijving, bijvoorbeeld Feestdag of Vakantie.').max(80, 'Maximaal 80 tekens.'),
      periods: z.array(period).max(4),
    })
    .refine((v) => v.endsOn >= v.startsOn, { message: 'De einddatum moet op of na de begindatum liggen.', path: ['endsOn'] })
    .refine((v) => v.isClosed || v.periods.length > 0, { message: 'Vul de openingstijden in, of kies ‘Gesloten’.', path: ['periods'] }),
  async (input, ctx) => {
    const problem = input.isClosed ? null : validatePeriods(input.periods);
    if (problem) throw new UserError(problem, { periods: problem });
    try {
      await db().transaction(async (tx) => {
        let exceptionId = input.id;
        const values = { startsOn: input.startsOn, endsOn: input.endsOn, isClosed: input.isClosed, label: input.label };
        if (exceptionId) {
          const rows = await tx
            .update(schema.openingExceptions)
            .set(values)
            .where(eq(schema.openingExceptions.id, exceptionId))
            .returning({ id: schema.openingExceptions.id });
          if (!rows.length) throw new UserError('Deze afwijking bestaat niet meer. Vernieuw de pagina.');
          await tx.delete(schema.openingExceptionPeriods).where(eq(schema.openingExceptionPeriods.exceptionId, exceptionId));
        } else {
          const [row] = await tx.insert(schema.openingExceptions).values(values).returning({ id: schema.openingExceptions.id });
          exceptionId = row!.id;
        }
        if (!input.isClosed) {
          await tx
            .insert(schema.openingExceptionPeriods)
            .values(input.periods.map((p) => ({ exceptionId: exceptionId!, opensAt: p.opens, closesAt: p.closes })));
        }
      });
    } catch (error) {
      const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code;
      if (code === '23P01') {
        throw new UserError('Er staat al een afwijking in (een deel van) deze periode. Pas die eerst aan of verwijder hem.', {
          startsOn: 'Overlapt met een andere afwijking.',
        });
      }
      throw error;
    }
    const when =
      input.startsOn === input.endsOn ? formatCalendarDate(input.startsOn) : `${formatCalendarDate(input.startsOn)} t/m ${formatCalendarDate(input.endsOn)}`;
    await logActivity(ctx.user.id, 'openingstijden', `${input.id ? 'Afwijking aangepast' : 'Afwijking toegevoegd'}: ${input.label} (${when})`);
    invalidatePublicContent();
    return { ok: true, message: input.id ? 'Wijzigingen opgeslagen.' : 'Afwijkende openingstijden toegevoegd.' };
  },
);

export const deleteException = adminAction(z.object({ id: z.uuid() }), async ({ id }, ctx) => {
  const [row] = await db().delete(schema.openingExceptions).where(eq(schema.openingExceptions.id, id)).returning({ label: schema.openingExceptions.label });
  if (!row) throw new UserError('Deze afwijking bestaat niet meer. Vernieuw de pagina.');
  await logActivity(ctx.user.id, 'openingstijden', `Afwijking verwijderd: ${row.label}`);
  invalidatePublicContent();
  return { ok: true, message: 'Afwijking verwijderd.' };
});
