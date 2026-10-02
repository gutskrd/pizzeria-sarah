'use client';

import { terminateOtherSessions, terminateSession } from '@/app/admin/(panel)/apparaten/actions';
import { useConfirm } from '@/components/admin/confirm';
import { PageTitle } from '@/components/admin/page-title';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { DevicesIcon, PinIcon, ShieldIcon } from '@/components/ui/icons';

export type DeviceSession = {
  id: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  isApproximateRegion: boolean;
  firstLogin: string;
  lastActive: string;
  lastActiveAgo: string;
  remember: boolean;
  isCurrent: boolean;
  ip: string | null;
};

export type SecurityItem = { id: number; label: string; detail: string; when: string; warning: boolean };

function DeviceGlyph({ type }: { type: string }) {
  const phone = type === 'phone';
  const tablet = type === 'tablet';
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {phone ? (
        <>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </>
      ) : tablet ? (
        <>
          <rect x="4.5" y="2.5" width="15" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </>
      )}
    </svg>
  );
}

export function DevicesView({ sessions, events }: { sessions: DeviceSession[]; events: SecurityItem[] }) {
  const { run } = useAdminAction();
  const confirm = useConfirm();
  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <>
      <PageTitle
        title="Ingelogde apparaten"
        description="Hier zie je op welke apparaten je bent ingelogd. Herken je een apparaat niet? Beëindig dan de sessie en wijzig je wachtwoord."
        actions={
          others.length > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Alle andere sessies beëindigen?',
                  message: (
                    <>
                      <p>
                        {others.length === 1 ? '1 ander apparaat wordt' : `${others.length} andere apparaten worden`} direct uitgelogd. Dit apparaat blijft
                        ingelogd.
                      </p>
                      <p className="mt-3 text-sm text-muted">Op die apparaten moet je daarna opnieuw inloggen met je wachtwoord en een code.</p>
                    </>
                  ),
                  confirmLabel: 'Alle andere beëindigen',
                  tone: 'danger',
                });
                if (ok) await run(() => terminateOtherSessions({}));
              }}
            >
              Alle andere sessies beëindigen
            </button>
          ) : undefined
        }
      />

      <ul className="space-y-3">
        {sessions.map((s) => (
          <li key={s.id} className={`admin-card p-4 sm:p-5 ${s.isCurrent ? 'border-basil/40 ring-1 ring-basil/30' : ''}`}>
            <div className="flex gap-4">
              <span
                className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${s.isCurrent ? 'bg-basil-soft text-basil' : 'bg-paper text-ink-soft'}`}
              >
                <DeviceGlyph type={s.deviceType} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{s.deviceName}</h2>
                  {s.isCurrent && <span className="admin-badge bg-basil text-white">Deze sessie</span>}
                </div>
                <p className="text-ink-soft">
                  {s.browser} · {s.os}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-ink-soft">
                  <PinIcon size={16} className="shrink-0" /> {s.location}
                  {s.isApproximateRegion && <span className="text-sm text-muted">(bij benadering)</span>}
                </p>
                <dl className="mt-2 grid gap-x-6 gap-y-0.5 text-sm text-muted sm:grid-cols-2">
                  <div>
                    <dt className="inline">Actief: </dt>
                    <dd className="inline font-medium text-ink">{s.isCurrent ? 'nu' : s.lastActiveAgo}</dd>
                  </div>
                  <div>
                    <dt className="inline">Ingelogd sinds: </dt>
                    <dd className="inline">{s.firstLogin}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="inline">Status: </dt>
                    <dd className="inline">{s.remember ? 'Blijft ingelogd (apparaat onthouden)' : 'Uitgelogd als de browser sluit'}</dd>
                  </div>
                </dl>
                {s.ip && (
                  <details className="mt-2 text-sm text-muted">
                    <summary className="inline-flex min-h-9 cursor-pointer items-center">Technische details</summary>
                    <p className="pb-1">IP-adres: {s.ip}</p>
                  </details>
                )}
              </div>
              {!s.isCurrent && (
                <div className="hidden shrink-0 sm:block">
                  <TerminateButton session={s} run={run} confirm={confirm} />
                </div>
              )}
            </div>
            {!s.isCurrent && (
              <div className="mt-3 sm:hidden">
                <TerminateButton session={s} run={run} confirm={confirm} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {sessions.length === 1 && <p className="mt-4 text-muted">Je bent alleen op dit apparaat ingelogd.</p>}

      <section className="mt-10" aria-labelledby="beveiliging">
        <h2 id="beveiliging" className="flex items-center gap-2 font-display text-2xl">
          <ShieldIcon size={22} /> Beveiligingsactiviteit
        </h2>
        <p className="mb-4 mt-1 text-muted">De laatste inlogpogingen en wijzigingen aan je account.</p>
        {events.length === 0 ? (
          <p className="text-muted">Nog geen activiteit.</p>
        ) : (
          <ul className="admin-card divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 sm:px-5">
                <span>
                  <span className={`font-medium ${e.warning ? 'text-tomato-dark' : ''}`}>{e.label}</span>
                  {e.detail && <span className="block text-sm text-muted">{e.detail}</span>}
                </span>
                <span className="text-sm text-muted">{e.when}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function TerminateButton({
  session,
  run,
  confirm,
}: {
  session: DeviceSession;
  run: ReturnType<typeof useAdminAction>['run'];
  confirm: ReturnType<typeof useConfirm>;
}) {
  return (
    <button
      type="button"
      className="admin-btn admin-btn-danger admin-btn-sm w-full sm:w-auto"
      onClick={async () => {
        const ok = await confirm({
          title: 'Sessie beëindigen?',
          message: `${session.deviceName} (${session.browser}) wordt direct uitgelogd.`,
          confirmLabel: 'Beëindigen',
          tone: 'danger',
        });
        if (ok) await run(() => terminateSession({ id: session.id }));
      }}
    >
      <DevicesIcon size={16} /> Beëindigen
    </button>
  );
}
