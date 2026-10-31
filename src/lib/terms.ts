/**
 * Recorded on User.termsVersion when a new account accepts the terms.
 * 2026-10-31 replaces the February 2026 text: business-only use, Portuguese
 * law with Lisbon venue, and the willful-misconduct / gross-negligence carve-out.
 */
export const TERMS_VERSION = "2026-10-31";

const TERMS_REQUIRED_ERROR =
  "You must accept the Terms of Service and Privacy Policy.";

/** Server-side gate. Anything other than boolean true is a refusal. */
export function termsConsentRejection(
  termsAccepted: unknown
): { status: 400; error: string } | null {
  if (termsAccepted !== true) {
    return { status: 400, error: TERMS_REQUIRED_ERROR };
  }
  return null;
}

/** Fields stored for a new user. Existing rows stay null; this is not a backfill. */
export function termsAcceptanceData(now: Date = new Date()): {
  termsAcceptedAt: Date;
  termsVersion: string;
} {
  return {
    termsAcceptedAt: now,
    termsVersion: TERMS_VERSION,
  };
}
