// Single-process limiter for this learning project; use a shared store across replicas.
export function rateLimit(limit = 10, windowMs = 15 * 60 * 1000) {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of entries) if (entry.until <= now) entries.delete(key);
    const key = req.ip;
    const entry = entries.get(key) || { count: 0, until: now + windowMs };
    entry.count++; entries.set(key, entry);
    if (entry.count > limit) { res.set("Retry-After", Math.ceil((entry.until - now) / 1000)); return res.status(429).json({ success: false, message: "Too many attempts. Please try again later" }); }
    next();
  };
}
