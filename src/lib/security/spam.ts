/**
 * Spam check for contact messages.
 *
 * Bots are mostly stopped before this point (hidden honeypot field, minimum
 * time to fill in the form, signed form token, rate limits and, when
 * configured, Cloudflare Turnstile). What gets through is scored here on
 * the content. A message is never thrown away on the score alone: a high score
 * only moves it to the Spam folder in the admin (without an e-mail), where
 * the owner can still find it and mark it as "Geen spam".
 */

export const SPAM_THRESHOLD = 5;

export type SpamInput = { name: string; email: string; subject: string; message: string; secondsToSubmit: number };
export type SpamVerdict = { score: number; reasons: string[]; isSpam: boolean };

// Throwaway mailbox services (a short list of the common ones).
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  'grr.la',
  '10minutemail.com',
  '10minutemail.net',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'yopmail.com',
  'yopmail.net',
  'trashmail.com',
  'trashmail.de',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'mintemail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'mohmal.com',
  'emailondeck.com',
  'spamgourmet.com',
  'mailnesia.com',
  'tempr.email',
  'burnermail.io',
]);

// Phrases from typical sales and scam spam (English and Dutch). Each one found adds to the score.
const SPAM_PHRASES = [
  'seo',
  'backlink',
  'link building',
  'guest post',
  'first page of google',
  'google ranking',
  'rank your website',
  'ranking on google',
  'website traffic',
  'traffic to your website',
  'increase your sales',
  'more customers for your',
  'digital marketing',
  'marketing agency',
  'marketing services',
  'web design services',
  'website redesign',
  'redesign your website',
  'app development',
  'virtual assistant',
  'outsourcing',
  'lead generation',
  'business loan',
  'funding for your business',
  'crypto',
  'bitcoin',
  'forex',
  'investment opportunity',
  'casino',
  'betting',
  'viagra',
  'cialis',
  'dating',
  'adult',
  'porn',
  'sexy',
  'click here',
  'unsubscribe',
  'opt out',
  'reply stop',
  'free trial',
  'limited time offer',
  '100% guaranteed',
  'whatsapp me',
  'telegram',
  'klik hier',
  'afmelden',
  'gratis proefperiode',
  'hoger in google',
  'meer bezoekers',
  'zoekmachineoptimalisatie',
  'online marketing',
];

const URL_RE =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(com|net|org|info|biz|io|co|ru|cn|xyz|top|site|online|shop|store|click|link|live|pro|app|me|ly|gl)\b(\/\S*)?/gi;
const HAS_URL_RE = new RegExp(URL_RE.source, 'i');
const MARKUP_RE = /<\s*(a|script|iframe|img|div|span|p|br)\b|\[\/?(url|link|img)\b|href\s*=/i;
// Letters from scripts that a Dutch restaurant hardly ever receives (Cyrillic, CJK, Thai, Hangul).
const UNUSUAL_SCRIPT_RE = /[Ѐ-ӿ぀-ヿ㐀-鿿가-힯฀-๿]/g;

const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

function countPhrases(text: string): string[] {
  const found = new Set<string>();
  for (const phrase of SPAM_PHRASES) {
    // Whole words only: "seo" must not match "museo", "adult" not "adultere".
    const re = new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (re.test(text)) found.add(phrase);
  }
  return [...found];
}

export function scoreMessage(input: SpamInput): SpamVerdict {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const all = `${input.subject}\n${input.message}`;
  const text = normalize(all);

  const links = all.match(URL_RE)?.length ?? 0;
  if (links >= 3) add(6, `Bevat ${links} links`);
  else if (links === 2) add(3, 'Bevat 2 links');
  else if (links === 1) add(1, 'Bevat een link');

  if (MARKUP_RE.test(all)) add(4, 'Bevat HTML- of linkcode');

  if (HAS_URL_RE.test(input.name) || /[@<>]|\d{4,}/.test(input.name)) add(4, 'Vreemde naam');

  const phrases = countPhrases(text);
  if (phrases.length) add(Math.min(6, phrases.length * 2), `Typische spamwoorden (${phrases.slice(0, 3).join(', ')})`);

  const letters = all.replace(/[^\p{L}]/gu, '');
  const unusual = all.match(UNUSUAL_SCRIPT_RE)?.length ?? 0;
  if (letters.length >= 20 && unusual / letters.length > 0.3) add(4, 'Ongebruikelijk schrift');

  const domain = input.email.split('@')[1]?.toLowerCase() ?? '';
  if (DISPOSABLE_DOMAINS.has(domain)) add(3, 'Wegwerp-e-mailadres');

  if (/\S{45,}/.test(input.message.replace(URL_RE, ''))) add(2, 'Onleesbare tekst');

  const upper = letters.replace(/[^\p{Lu}]/gu, '').length;
  if (letters.length >= 30 && upper / letters.length > 0.6) add(1, 'Bijna alles in hoofdletters');

  if (input.secondsToSubmit < 6) add(2, 'Heel snel verstuurd');

  return { score, reasons, isSpam: score >= SPAM_THRESHOLD };
}

/** Same sender + same text = a double submission, not a new message. */
export function messageFingerprintSource(email: string, message: string): string {
  return `${email.trim().toLowerCase()}|${normalize(message).replace(/\s+/g, ' ').trim()}`;
}
