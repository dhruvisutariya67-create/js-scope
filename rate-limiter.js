"use strict";

/**
 * Sliding-window rate limiter using closure state.
 *
 * @param {Function} fn - Target function to wrap
 * @param {number} maxCalls - Max invocations allowed in intervalMs
 * @param {number} intervalMs - Window length in milliseconds
 * @param {Function} now - Time provider (defaults to Date.now)
 */
function rateLimit(fn, maxCalls, intervalMs, now = Date.now) {
  if (typeof fn !== "function" || typeof now !== "function") {
    throw new TypeError("Expected function");
  }
  if (!Number.isInteger(maxCalls) || maxCalls <= 0 || !Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Invalid limits");
  }

  // Encapsulated timestamp log for this specific rate limiter instance
  let timestamps = [];

  return function (...args) {
    const currentTime = now();

    // Purge timestamps outside our sliding window
    timestamps = timestamps.filter(t => currentTime - t < intervalMs);

    if (timestamps.length >= maxCalls) {
      const error = new Error("Rate limit exceeded");
      error.retryAfterMs = Math.max(0, intervalMs - (currentTime - timestamps[0]));
      throw error;
    }

    timestamps.push(currentTime);
    return fn.apply(this, args);
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { rateLimit };
}
