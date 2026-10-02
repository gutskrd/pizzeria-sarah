const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const AUTH = {
  /** "Dit apparaat onthouden": signed out after ~30 days without any activity. */
  rememberIdleMs: 30 * DAY,
  /** Absolute maximum for a remembered session; then a fresh login is required. */
  rememberAbsoluteMs: 365 * DAY,
  /** Not remembered: browser-session cookie, server-side idle limit. */
  shortIdleMs: 12 * HOUR,
  shortAbsoluteMs: 7 * DAY,
  /** The session token is rotated once a day while in use. */
  rotateAfterMs: DAY,
  /** The previous token stays valid briefly to avoid races between parallel requests. */
  rotationGraceMs: 2 * MINUTE,
  /** last_seen_at is updated at most once per minute. */
  touchIntervalMs: MINUTE,
  /** A remembered device skips the e-mail code for this long. */
  trustedDeviceMs: 90 * DAY,
  codeTtlMs: 10 * MINUTE,
  codeMaxAttempts: 5,
  codeResendCooldownMs: 60 * 1000,
  codeMaxSends: 5,
  resetTokenTtlMs: HOUR,
} as const;
