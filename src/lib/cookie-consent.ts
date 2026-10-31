export const COOKIE_CONSENT_KEY = "cookie-consent-dismissed";

/** Stored when the visitor clicks Accept. The legacy value "true" still counts as granted. */
export const COOKIE_CONSENT_GRANTED = "granted";

/** Stored when the visitor clicks Reject. The Meta Pixel must not load. */
export const COOKIE_CONSENT_DENIED = "denied";

export const COOKIE_CONSENT_CHANGED_EVENT = "cookie-consent-changed";
export const COOKIE_PREFERENCES_OPEN_EVENT = "cookie-preferences-open";

type ConsentWindow = Window & typeof globalThis;

function consentWindow(): ConsentWindow | null {
  const candidate = (globalThis as { window?: ConsentWindow }).window;
  if (!candidate) return null;
  return candidate;
}

function readRaw(): string | null {
  const view = consentWindow();
  if (!view) return null;
  try {
    return view.localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): void {
  const view = consentWindow();
  if (!view) return;
  view.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  view.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
}

export function hasStoredCookieChoice(): boolean {
  const value = readRaw();
  return (
    value === COOKIE_CONSENT_GRANTED ||
    value === "true" ||
    value === COOKIE_CONSENT_DENIED
  );
}

/** True only after an explicit accept. Rejection does not grant consent. */
export function hasCookieConsent(): boolean {
  const value = readRaw();
  return value === COOKIE_CONSENT_GRANTED || value === "true";
}

/** The Meta Pixel may load only after Accept. Reject and "no choice" both block it. */
export function shouldLoadMetaPixel(): boolean {
  return hasCookieConsent();
}

export function grantCookieConsent(): void {
  writeRaw(COOKIE_CONSENT_GRANTED);
  consentWindow()?.dispatchEvent(new Event("cookie-consent-granted"));
}

export function rejectCookieConsent(): void {
  writeRaw(COOKIE_CONSENT_DENIED);
}

export function openCookiePreferences(): void {
  consentWindow()?.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
}
