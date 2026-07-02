import type {NextApiRequest, NextApiResponse} from 'next';
import {db, type UserRow} from '../../../lib/db';
import {createLoginToken} from '../../../lib/auth';
import {appOrigin, sendEmail} from '../../../lib/email';
import {allowHits} from '../../../lib/rateLimit';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const clientIp = (req: NextApiRequest): string => {
	// The LAST X-Forwarded-For entry is the one our ingress appended (it
	// replaces client-supplied values by default, but last stays correct even
	// under append-mode configs — first would be attacker-controlled there).
	const forwarded = req.headers['x-forwarded-for'];
	const last = (Array.isArray(forwarded) ? forwarded.at(-1) : forwarded)?.split(',').at(-1)?.trim();
	return last || (req.socket.remoteAddress ?? 'unknown');
};

const handler = (req: NextApiRequest, res: NextApiResponse) => {
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
	// crowd-sized.
	const ip = clientIp(req);
	const allowed = allowHits([
		{key: `minute:${ip}`, limit: 5, windowMs: MINUTE},
		{key: `hour:${ip}`, limit: 40, windowMs: HOUR},
	]);
	if (!allowed) {
		res.status(429).json({error: 'Too many sign-in links requested — check your inbox, or try again in a few minutes'});
		return;
	}

	const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
	if (user) {
		const token = createLoginToken(user.id);
		// Fire-and-forget: awaiting SES (with retries this can take >10s worst
		// case) would trip the client's timeout and prompt a resend. We already
		// answer 200-without-sending for unregistered emails, so the response
		// never confirmed delivery anyway.
		sendEmail({
			to: user.email,
			subject: 'Your AdamCon sign-in link',
			template: {
				heading: 'Sign in',
				paragraphs: ['Tap the button to sign in to AdamCon. This link is just for you.'],
				cta: {label: 'Sign in', url: `${appOrigin()}/verify/?token=${token}`},
			},
		}).catch((error: unknown) => {
			console.error(`Failed to send sign-in email to user ${user.id}:`, error);
		});
	}

	// Same response either way, so the endpoint doesn't leak who's registered.
	res.status(200).json({ok: true});
};

export default handler;
