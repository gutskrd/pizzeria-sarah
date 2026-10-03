import { siteUrl } from '@/lib/env';

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const paragraphs = (text: string) =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

function layout(title: string, bodyHtml: string, footer = 'Dit is een automatisch bericht van de website van Pizzeria Sarah.'): string {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f1e9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a211c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#2a1b14;padding:20px 28px;color:#f6f1e9;font-family:Georgia,'Times New Roman',serif;font-size:20px">Pizzeria Sarah</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.55">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:13px;color:#6f625a;border-top:1px solid #eee4d8">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#b8321f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${escapeHtml(label)}</a></p>`;

export function verificationCodeEmail(code: string) {
  const subject = `Je inlogcode: ${code}`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px">Je inlogcode</h1>
<p style="margin:0 0 16px">Gebruik deze code om in te loggen op het beheer van de website:</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:8px 0 24px;font-family:'SFMono-Regular',Consolas,monospace">${escapeHtml(code)}</p>
<p style="margin:0 0 16px">De code is 10 minuten geldig en kan maar één keer worden gebruikt.</p>
<p style="margin:0;color:#6f625a">Heb je niet geprobeerd in te loggen? Dan kun je deze e-mail negeren. Wijzig voor de zekerheid wel je wachtwoord als je dit vaker ontvangt.</p>`,
  );
  const text = `Je inlogcode is: ${code}\n\nDe code is 10 minuten geldig en kan maar één keer worden gebruikt.\n\nHeb je niet geprobeerd in te loggen? Dan kun je deze e-mail negeren.`;
  return { subject, html, text };
}

export type LoginNotice = { device: string; browser: string; location: string; when: string };

export function newLoginEmail(info: LoginNotice) {
  const subject = 'Nieuwe aanmelding bij Pizzeria Sarah';
  const url = `${siteUrl()}/admin/apparaten`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px">Nieuwe aanmelding</h1>
<p style="margin:0 0 16px">Er is zojuist ingelogd op het beheer van de website vanaf een nieuw apparaat.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:15px">
<tr><td style="padding:4px 16px 4px 0;color:#6f625a">Apparaat</td><td>${escapeHtml(info.device)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#6f625a">Browser</td><td>${escapeHtml(info.browser)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#6f625a">Locatie (bij benadering)</td><td>${escapeHtml(info.location)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#6f625a">Tijdstip</td><td>${escapeHtml(info.when)}</td></tr>
</table>
<p style="margin:0 0 8px"><strong>Was jij dit niet?</strong> Controleer dan je ingelogde apparaten en beëindig de sessie. Wijzig daarna je wachtwoord.</p>
${button(url, 'Ingelogde apparaten bekijken')}`,
  );
  const text = `Nieuwe aanmelding bij Pizzeria Sarah\n\nApparaat: ${info.device}\nBrowser: ${info.browser}\nLocatie (bij benadering): ${info.location}\nTijdstip: ${info.when}\n\nWas jij dit niet? Controleer dan je ingelogde apparaten en beëindig de sessie: ${url}`;
  return { subject, html, text };
}

export function passwordResetEmail(resetUrl: string) {
  const subject = 'Nieuw wachtwoord instellen';
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px">Nieuw wachtwoord instellen</h1>
<p style="margin:0 0 16px">Je hebt gevraagd om een nieuw wachtwoord voor het beheer van de website. Klik op de knop om een nieuw wachtwoord te kiezen.</p>
${button(resetUrl, 'Nieuw wachtwoord kiezen')}
<p style="margin:0 0 16px">Deze link is 1 uur geldig en werkt maar één keer.</p>
<p style="margin:0;color:#6f625a">Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren; je wachtwoord blijft hetzelfde.</p>`,
  );
  const text = `Je hebt gevraagd om een nieuw wachtwoord voor het beheer van de website.\n\nKies een nieuw wachtwoord via deze link (1 uur geldig, werkt één keer):\n${resetUrl}\n\nHeb je dit niet aangevraagd? Dan kun je deze e-mail negeren.`;
  return { subject, html, text };
}

export function passwordChangedEmail(when: string) {
  const subject = 'Je wachtwoord is gewijzigd';
  const url = `${siteUrl()}/admin/wachtwoord-vergeten`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px">Wachtwoord gewijzigd</h1>
<p style="margin:0 0 16px">Het wachtwoord voor het beheer van de website is op ${escapeHtml(when)} gewijzigd. Alle andere apparaten zijn uitgelogd.</p>
<p style="margin:0 0 8px"><strong>Was jij dit niet?</strong> Stel dan meteen een nieuw wachtwoord in.</p>
${button(url, 'Nieuw wachtwoord instellen')}`,
  );
  const text = `Het wachtwoord voor het beheer van de website is op ${when} gewijzigd. Alle andere apparaten zijn uitgelogd.\n\nWas jij dit niet? Stel dan meteen een nieuw wachtwoord in: ${url}`;
  return { subject, html, text };
}

const BUNDLE_NOTE = 'Je krijgt hooguit één e-mail per kwartier; komen er meer berichten binnen, dan krijg je daarna één e-mail met alles bij elkaar.';

export function contactNotificationEmail(msg: { name: string; email: string; subject: string; body: string; id: string; othersWaiting?: number }) {
  const subject = `Nieuw bericht via de website: ${msg.subject}`;
  const url = `${siteUrl()}/admin/berichten/${msg.id}`;
  const others = msg.othersWaiting ?? 0;
  const othersLine = others > 0 ? `Er ${others === 1 ? 'wacht nog 1 ander ongelezen bericht' : `wachten nog ${others} andere ongelezen berichten`}.` : '';
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px">Nieuw bericht</h1>
<p style="margin:0 0 4px"><strong>Van:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p>
<p style="margin:0 0 16px"><strong>Onderwerp:</strong> ${escapeHtml(msg.subject)}</p>
<div style="background:#f6f1e9;border-radius:6px;padding:16px;margin:0 0 16px">${paragraphs(msg.body)}</div>
${othersLine ? `<p style="margin:0 0 16px">${escapeHtml(othersLine)}</p>` : ''}
${button(url, 'Bekijken en beantwoorden')}`,
    `Dit is een automatisch bericht van de website van Pizzeria Sarah. ${BUNDLE_NOTE}`,
  );
  const text = `Nieuw bericht via de website\n\nVan: ${msg.name} <${msg.email}>\nOnderwerp: ${msg.subject}\n\n${msg.body}\n\n${othersLine ? `${othersLine}\n\n` : ''}Bekijken en beantwoorden: ${url}`;
  return { subject, html, text };
}

/** One e-mail for several messages that came in within a short time. */
export function contactDigestEmail(messages: Array<{ name: string; subject: string; id: string }>, total: number) {
  const subject = `${total} nieuwe berichten via de website`;
  const url = `${siteUrl()}/admin/berichten?status=new`;
  const list = messages.map((m) => `<li style="margin:0 0 8px"><strong>${escapeHtml(m.name)}</strong>: ${escapeHtml(m.subject)}</li>`).join('');
  const more = total > messages.length ? `<p style="margin:0 0 16px">En nog ${total - messages.length} meer.</p>` : '';
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(subject)}</h1>
<ul style="padding-left:20px;margin:0 0 16px">${list}</ul>${more}
${button(url, 'Berichten bekijken')}`,
    `Dit is een automatisch bericht van de website van Pizzeria Sarah. ${BUNDLE_NOTE}`,
  );
  const text = `${subject}\n\n${messages.map((m) => `- ${m.name}: ${m.subject}`).join('\n')}${total > messages.length ? `\nEn nog ${total - messages.length} meer.` : ''}\n\nBerichten bekijken: ${url}`;
  return { subject, html, text };
}

export function replyEmail(opts: { businessName: string; customerName: string; originalSubject: string; originalBody: string; reply: string; sentAt: string }) {
  const subject = `Re: ${opts.originalSubject}`;
  const quoted = opts.originalBody
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');
  const html = layout(
    subject,
    `${paragraphs(opts.reply)}
<p style="margin:24px 0 0">Met vriendelijke groet,<br>${escapeHtml(opts.businessName)}</p>
<div style="margin-top:28px;padding-left:12px;border-left:3px solid #eee4d8;color:#6f625a;font-size:14px">
<p style="margin:0 0 8px">Op ${escapeHtml(opts.sentAt)} schreef ${escapeHtml(opts.customerName)}:</p>${paragraphs(opts.originalBody)}</div>`,
    `Je ontvangt deze e-mail als antwoord op je bericht via de website van ${opts.businessName}. Je kunt deze e-mail gewoon beantwoorden.`,
  );
  const text = `${opts.reply}\n\nMet vriendelijke groet,\n${opts.businessName}\n\nOp ${opts.sentAt} schreef ${opts.customerName}:\n${quoted}`;
  return { subject, html, text };
}
