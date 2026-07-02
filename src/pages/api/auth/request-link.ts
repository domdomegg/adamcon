import type {NextApiRequest, NextApiResponse} from 'next';
import {db, type UserRow} from '../../../lib/db';
import {createLoginToken} from '../../../lib/auth';
import {appOrigin, sendEmail} from '../../../lib/email';
import {allowHit} from '../../../lib/rateLimit';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const clientIp = (req: NextApiRequest): string => {
	const forwarded = req.headers['x-forwarded-for'];
	const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
	return first ?? req.socket.remoteAddress ?? 'unknown';
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'POST') {
		res.status(405).end();
		return;
	}

	const email = String(req.body?.email ?? '').trim();
	if (!email.includes('@')) {
		res.status(400).json({error: 'Enter an email address'});
		return;
	}

	// Throttle so this can't be used to flood an attendee's inbox (each send
	// also costs an SES call). By IP only — a per-email limit would let anyone
	// lock a victim out of sign-in by burning their allowance. Caveat: all
	// IPv4 traffic arrives via the relay's single IP (socat, no PROXY
	// protocol), so IPv4 clients share these buckets — keep the limits
	// crowd-sized. Both windows must record the hit, so no short-circuit.
	const ip = clientIp(req);
	const withinBurst = allowHit(`minute:${ip}`, 5, MINUTE);
	const withinSustained = allowHit(`hour:${ip}`, 20, HOUR);
	if (!withinBurst || !withinSustained) {
		res.status(429).json({error: 'Too many sign-in links requested — check your inbox, or try again in a few minutes'});
		return;
	}

	const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
	if (user) {
		const token = createLoginToken(user.id);
		await sendEmail({
			to: user.email,
			subject: 'Your AdamCon sign-in link',
			template: {
				heading: 'Sign in',
				paragraphs: ['Tap the button to sign in to AdamCon. This link is just for you.'],
				cta: {label: 'Sign in', url: `${appOrigin()}/verify/?token=${token}`},
			},
		});
	}

	// Same response either way, so the endpoint doesn't leak who's registered.
	res.status(200).json({ok: true});
};

export default handler;
