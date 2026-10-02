'use client';

import Link from 'next/link';
import { changePassword, saveBusinessInfo, saveNotifications, saveSocialLinks, updateAccount } from '@/app/admin/(panel)/instellingen/actions';
import { PasswordInput } from '@/components/admin/auth/password-input';
import { Field, Toggle } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { SectionForm } from '@/components/admin/section-form';
import { ArrowRightIcon } from '@/components/ui/icons';

export type SettingsData = {
  business: {
    businessName: string;
    tagline: string;
    phoneDisplay: string;
    email: string;
    street: string;
    postalCode: string;
    city: string;
    foundedYear: string;
  };
  social: { facebookUrl: string; instagramUrl: string };
  notifications: { newDeviceAlerts: boolean; messageAlerts: boolean };
  account: { name: string; email: string };
};

export function SettingsView({ data }: { data: SettingsData }) {
  return (
    <>
      <PageTitle title="Instellingen" description="De gegevens van je zaak, meldingen en je account." />
      <div className="space-y-6">
        <SectionForm
          id="bedrijf"
          title="Gegevens van de zaak"
          description="Deze gegevens staan op de hele website, onder andere bij Contact en onderaan elke pagina."
          initial={data.business}
          save={saveBusinessInfo}
        >
          {(v, set, e) => (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Naam van de zaak" htmlFor="s-naam" error={e.businessName}>
                  <input id="s-naam" className="admin-input" value={v.businessName} maxLength={80} onChange={(x) => set('businessName', x.target.value)} />
                </Field>
                <Field label="Korte omschrijving" htmlFor="s-tagline" hint="Gebruik · tussen de onderdelen." error={e.tagline}>
                  <input id="s-tagline" className="admin-input" value={v.tagline} maxLength={80} onChange={(x) => set('tagline', x.target.value)} />
                </Field>
                <Field label="Telefoonnummer" htmlFor="s-tel" error={e.phoneDisplay}>
                  <input
                    id="s-tel"
                    className="admin-input"
                    type="tel"
                    inputMode="tel"
                    value={v.phoneDisplay}
                    maxLength={30}
                    onChange={(x) => set('phoneDisplay', x.target.value)}
                  />
                </Field>
                <Field label="E-mailadres" htmlFor="s-mail" hint="Hier komen ook de berichten van het contactformulier binnen." error={e.email}>
                  <input
                    id="s-mail"
                    className="admin-input"
                    type="email"
                    inputMode="email"
                    value={v.email}
                    maxLength={254}
                    onChange={(x) => set('email', x.target.value)}
                  />
                </Field>
                <Field label="Straat en huisnummer" htmlFor="s-straat" error={e.street}>
                  <input id="s-straat" className="admin-input" value={v.street} maxLength={100} onChange={(x) => set('street', x.target.value)} />
                </Field>
                <div className="grid grid-cols-[8rem_1fr] gap-3">
                  <Field label="Postcode" htmlFor="s-postcode" error={e.postalCode}>
                    <input id="s-postcode" className="admin-input" value={v.postalCode} maxLength={10} onChange={(x) => set('postalCode', x.target.value)} />
                  </Field>
                  <Field label="Plaats" htmlFor="s-plaats" error={e.city}>
                    <input id="s-plaats" className="admin-input" value={v.city} maxLength={60} onChange={(x) => set('city', x.target.value)} />
                  </Field>
                </div>
                <Field label="Gevestigd sinds (jaar)" htmlFor="s-jaar" error={e.foundedYear}>
                  <input
                    id="s-jaar"
                    className="admin-input max-w-[8rem]"
                    inputMode="numeric"
                    value={v.foundedYear}
                    maxLength={4}
                    onChange={(x) => set('foundedYear', x.target.value)}
                  />
                </Field>
              </div>
            </>
          )}
        </SectionForm>

        <SectionForm
          id="social"
          title="Social media"
          description="Laat leeg als je geen pagina hebt. Ingevulde links verschijnen onderaan de website."
          initial={data.social}
          save={saveSocialLinks}
        >
          {(v, set, e) => (
            <>
              <Field label="Facebook" htmlFor="s-fb" optional error={e.facebookUrl}>
                <input
                  id="s-fb"
                  className="admin-input"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.facebook.com/…"
                  value={v.facebookUrl}
                  onChange={(x) => set('facebookUrl', x.target.value)}
                />
              </Field>
              <Field label="Instagram" htmlFor="s-ig" optional error={e.instagramUrl}>
                <input
                  id="s-ig"
                  className="admin-input"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.instagram.com/…"
                  value={v.instagramUrl}
                  onChange={(x) => set('instagramUrl', x.target.value)}
                />
              </Field>
            </>
          )}
        </SectionForm>

        <SectionForm id="meldingen" title="Meldingen per e-mail" initial={data.notifications} save={saveNotifications}>
          {(v, set) => (
            <>
              <Toggle
                checked={v.messageAlerts}
                onChange={(x) => set('messageAlerts', x)}
                label="Nieuw bericht via de website"
                description="Je krijgt een e-mail als iemand het contactformulier invult."
              />
              <Toggle
                checked={v.newDeviceAlerts}
                onChange={(x) => set('newDeviceAlerts', x)}
                label="Inloggen op een nieuw apparaat"
                description="Aanbevolen. Zo merk je het meteen als iemand anders probeert in te loggen."
              />
            </>
          )}
        </SectionForm>

        <SectionForm
          id="account"
          title="Je account"
          description="Je naam en het e-mailadres waarmee je inlogt. De inlogcodes worden naar dit adres gestuurd."
          initial={{ ...data.account, currentPassword: '' }}
          save={(v) => updateAccount(v)}
        >
          {(v, set, e) => (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Je naam" htmlFor="a-naam" error={e.name}>
                  <input id="a-naam" className="admin-input" value={v.name} maxLength={60} autoComplete="name" onChange={(x) => set('name', x.target.value)} />
                </Field>
                <Field label="Inlog-e-mailadres" htmlFor="a-mail" error={e.email}>
                  <input
                    id="a-mail"
                    className="admin-input"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={v.email}
                    onChange={(x) => set('email', x.target.value)}
                  />
                </Field>
              </div>
              {v.email.trim().toLowerCase() !== data.account.email && (
                <Field label="Huidig wachtwoord" htmlFor="a-ww" hint="Ter controle, omdat je je inlog-e-mailadres wijzigt." error={e.currentPassword}>
                  <PasswordInput id="a-ww" autoComplete="current-password" value={v.currentPassword} onChange={(x) => set('currentPassword', x.target.value)} />
                </Field>
              )}
            </>
          )}
        </SectionForm>

        <SectionForm
          id="wachtwoord"
          title="Wachtwoord wijzigen"
          description="Na het wijzigen worden al je andere apparaten uitgelogd. Je krijgt hierover ook een e-mail."
          initial={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
          save={async (v) => {
            const r = await changePassword(v);
            return r;
          }}
          success="Wachtwoord gewijzigd."
          resetAfterSave
        >
          {(v, set, e) => (
            <>
              <Field label="Huidig wachtwoord" htmlFor="w-oud" error={e.currentPassword}>
                <PasswordInput id="w-oud" autoComplete="current-password" value={v.currentPassword} onChange={(x) => set('currentPassword', x.target.value)} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nieuw wachtwoord" htmlFor="w-nieuw" hint="Minimaal 10 tekens." error={e.newPassword}>
                  <PasswordInput id="w-nieuw" autoComplete="new-password" value={v.newPassword} onChange={(x) => set('newPassword', x.target.value)} />
                </Field>
                <Field label="Herhaal nieuw wachtwoord" htmlFor="w-herhaal" error={e.confirmPassword}>
                  <PasswordInput
                    id="w-herhaal"
                    autoComplete="new-password"
                    value={v.confirmPassword}
                    onChange={(x) => set('confirmPassword', x.target.value)}
                  />
                </Field>
              </div>
            </>
          )}
        </SectionForm>

        <div className="admin-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-display text-2xl">Teksten en zoekmachines</h2>
            <p className="text-[0.95rem] text-muted">De teksten op de website en hoe je zaak in Google verschijnt, pas je aan onder Website.</p>
          </div>
          <Link href="/admin/website#zoekmachines" className="admin-btn admin-btn-secondary">
            Naar Website <ArrowRightIcon size={18} />
          </Link>
        </div>
      </div>
    </>
  );
}
