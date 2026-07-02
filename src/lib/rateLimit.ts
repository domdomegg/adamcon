// In-memory sliding-window rate limiter. Single-process app, so a shared
// module-level map is enough; counters reset on restart, which is fine for
// abuse throttling (this guards email sending, not authentication).

type Bucket = {times: number[]; expiresAt: number};

const buckets = new Map<string, Bucket>();

/**
 * Checks every window and records the hit in all of them only if all allow
 * it. Blocked attempts are deliberately not recorded: they must not extend a
 * lockout, and it bounds each bucket at `limit` entries.
 */
export const allowHits = (checks: {key: string; limit: number; windowMs: number}[]): boolean => {
	const now = Date.now();
	const recents = checks.map(({key, windowMs}) => (buckets.get(key)?.times ?? []).filter((t) => t > now - windowMs));
	if (checks.some(({limit}, i) => recents[i].length >= limit)) {
		return false;
	}

	checks.forEach(({key, windowMs}, i) => {
		recents[i].push(now);
		buckets.set(key, {times: recents[i], expiresAt: now + windowMs});
	});

	if (buckets.size > 10_000) {
		// Safety valve so a scan of many keys can't grow the map unboundedly;
		// only expired buckets are dropped, so live limits are unaffected.
		for (const [key, bucket] of buckets) {
			if (bucket.expiresAt < now) {
				buckets.delete(key);
			}
		}
	}

	return true;
};
