/**
 * OWASP-aligned security utilities for Supply Pulse
 * Covers: A03 (Injection), A04 (Insecure Design), A05 (Security Misconfiguration)
 */

// ---- A03: Input validation ----

/** Validates that a string looks like a CUID (Prisma default ID format) */
const CUID_REGEX = /^c[a-z0-9]{24}$/;
export function isValidCuid(id: string): boolean {
  return CUID_REGEX.test(id);
}

/** Strip potential XSS from a string for use in HTML contexts (e.g. email templates) */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Validate that a URL is from a trusted domain (for redirect protection) */
const TRUSTED_DOMAINS = [
  "polar.sh",
  "sandbox.polar.sh",
  "checkout.polar.sh",
  "api.polar.sh",
];

export function isTrustedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      TRUSTED_DOMAINS.some(
        (domain) =>
          parsed.hostname === domain ||
          parsed.hostname.endsWith(`.${domain}`)
      )
    );
  } catch {
    return false;
  }
}

// ---- A04: Rate limiting (in-memory, per-IP) ----

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * Returns { success: true } if under limit, { success: false, retryAfterMs } if over.
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (entry.count >= maxRequests) {
    return { success: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { success: true };
}

/** Extract client IP from request headers */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ---- A09: Sanitized logging ----

/** Sanitize sensitive data before logging */
export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ["password", "token", "secret", "apiKey", "authorization", "cookie"];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 200) {
      sanitized[key] = value.slice(0, 200) + "...[truncated]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
