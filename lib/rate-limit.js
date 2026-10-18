/**
 * In-memory sliding window rate limiter untuk Next.js Route Handlers.
 * Mencegah serangan spam dan request flooding pada mutasi data.
 */

const rateLimitMap = new Map();

// Interval pembersihan memori otomatis setiap 5 menit
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now - record.resetTime > 60000) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
}

/**
 * Memeriksa apakah suatu identifier (misal: user.id atau IP) melebihi batas request.
 * @param {string} identifier - Kunci unik pengguna
 * @param {number} limit - Jumlah maksimal request dalam jendela waktu (default: 60)
 * @param {number} windowMs - Jendela waktu dalam milidetik (default: 60.000 ms / 1 menit)
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(identifier, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count < limit) {
    record.count++;
    return {
      allowed: true,
      remaining: limit - record.count,
      resetTime: record.resetTime,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime,
  };
}
