export const COOKIE_CONSENT_KEY = "cookie-consent-dismissed";

export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === "true";
}

export function grantCookieConsent(): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, "true");
  window.dispatchEvent(new Event("cookie-consent-granted"));
}
