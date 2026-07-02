// In-memory sliding-window rate limiter. Single-process app, so a shared
// module-level map is enough; counters reset on restart, which is fine for
// abuse throttling (this guards email sending, not authentication).

const hits = new Map<string, number[]>();

/** Records a hit for the key and returns whether it stays within limit per windowMs. */
export const allowHit = (key: string, limit: number, windowMs: number): boolean => {
	const now = Date.now();
	const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
	recent.push(now);
	hits.set(key, recent);
	if (hits.size > 10_000) {
		// Safety valve so a scan of many keys can't grow the map unboundedly.
		hits.clear();
	}

	return recent.length <= limit;
};
