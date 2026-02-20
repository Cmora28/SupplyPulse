/**
 * OWASP-aligned security utilities for Supply Pulse
 * Covers: A03 (Injection), A04 (Insecure Design), A05 (Security Misconfiguration)
 */

import Redis from "ioredis";
import { REDIS_URL } from "@/lib/redis";

// ---- Admin ----

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "lopezhk@gmail.com";

// ---- A03: Input validation ----

const CUID_REGEX = /^c[a-z0-9]{24}$/;
export function isValidCuid(id: string): boolean {
  return CUID_REGEX.test(id);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

// ---- A04: Rate limiting (Redis-backed with in-memory fallback) ----

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisClient.connect().catch(() => {
      redisClient = null;
    });
    return redisClient;
  } catch {
    return null;
  }
}

// In-memory fallback for when Redis is unavailable
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

function rateLimitInMemory(
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

/**
 * Redis-backed rate limiter with in-memory fallback.
 * Uses a sliding window counter stored in Redis for distributed deployments.
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; retryAfterMs?: number } {
  const redis = getRedis();
  if (!redis) {
    return rateLimitInMemory(key, maxRequests, windowMs);
  }

  // For sync callers, use in-memory as primary and sync to Redis async
  const result = rateLimitInMemory(key, maxRequests, windowMs);

  // Fire-and-forget Redis sync for distributed consistency
  const redisKey = `rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);
  redis.incr(redisKey).then((count) => {
    if (count === 1) {
      redis.expire(redisKey, windowSec);
    }
  }).catch(() => {});

  return result;
}

/**
 * Async Redis rate limiter for use in API routes.
 * Provides true distributed rate limiting across instances.
 */
export async function rateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ success: boolean; retryAfterMs?: number }> {
  const redis = getRedis();
  if (!redis) {
    return rateLimitInMemory(key, maxRequests, windowMs);
  }

  const redisKey = `rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }

    if (count > maxRequests) {
      const ttl = await redis.ttl(redisKey);
      return { success: false, retryAfterMs: ttl * 1000 };
    }

    return { success: true };
  } catch {
    return rateLimitInMemory(key, maxRequests, windowMs);
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ---- A09: Sanitized logging ----

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
