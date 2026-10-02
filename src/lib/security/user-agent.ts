export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'unknown';

export type ClientDevice = {
  deviceType: DeviceType;
  /** Owner-friendly Dutch name, e.g. "iPhone", "Windows-pc". */
  deviceName: string;
  browser: string;
  os: string;
  /** Browser family + OS family. Stable across version updates. */
  fingerprint: string;
};

/**
 * Small, dependency-free user-agent parser. Only extracts what the owner needs
 * to recognise their own devices; it is not used for security decisions other
 * than detecting a session that suddenly moves to a different browser/OS.
 */
export function parseUserAgent(ua: string | null | undefined): ClientDevice {
  const s = ua ?? '';

  let os = 'Onbekend systeem';
  let deviceType: DeviceType = 'unknown';
  let deviceName = 'Onbekend apparaat';

  if (/iPhone|iPod/.test(s)) {
    os = 'iOS';
    deviceType = 'phone';
    deviceName = 'iPhone';
  } else if (/iPad/.test(s)) {
    os = 'iPadOS';
    deviceType = 'tablet';
    deviceName = 'iPad';
  } else if (/Android/.test(s)) {
    os = 'Android';
    const isTablet = !/Mobile/.test(s);
    deviceType = isTablet ? 'tablet' : 'phone';
    deviceName = isTablet ? 'Android-tablet' : 'Android-telefoon';
  } else if (/CrOS/.test(s)) {
    os = 'ChromeOS';
    deviceType = 'desktop';
    deviceName = 'Chromebook';
  } else if (/Windows/.test(s)) {
    os = 'Windows';
    deviceType = 'desktop';
    deviceName = 'Windows-pc';
  } else if (/Macintosh|Mac OS X/.test(s)) {
    os = 'macOS';
    deviceType = 'desktop';
    deviceName = 'Mac';
  } else if (/Linux/.test(s)) {
    os = 'Linux';
    deviceType = 'desktop';
    deviceName = 'Linux-computer';
  }

  let browser = 'Onbekende browser';
  if (/Edg(e|A|iOS)?\//.test(s)) browser = 'Edge';
  else if (/SamsungBrowser\//.test(s)) browser = 'Samsung Internet';
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera';
  else if (/Firefox\/|FxiOS\//.test(s)) browser = 'Firefox';
  else if (/Chrome\/|CriOS\//.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = 'Safari';
  else if (/AppleWebKit/.test(s) && (os === 'iOS' || os === 'iPadOS')) browser = 'Safari';

  return { deviceType, deviceName, browser, os, fingerprint: `${browser}|${os}` };
}
