import { AppError, ErrorCode } from "../errors/app-error";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  memoryStore.forEach((record, key) => {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
    }
  });
}, 5 * 60 * 1000).unref?.();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max allowed requests within window
  message?: string;
}

/**
 * Enforces rate limiting on sensitive authentication operations.
 * Uses an in-memory sliding window store (compatible with Redis distributed store).
 */
export function checkRateLimit(key: string, options: RateLimitOptions): void {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (record.count >= options.maxRequests) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    throw new AppError(
      options.message || `Too many requests. Please try again after ${retryAfterSec} seconds.`,
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      { retryAfterSec }
    );
  }

  record.count += 1;
}

/**
 * Resets rate limit for a key (e.g. after a successful login).
 */
export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}
