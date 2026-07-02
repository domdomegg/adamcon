import type {NextApiRequest, NextApiResponse} from 'next';
import {db, type UserRow} from '../../../lib/db';
import {createLoginToken} from '../../../lib/auth';
import {appOrigin, sendEmail} from '../../../lib/email';
import {allowHit} from '../../../lib/rateLimit';

const TEN_MINUTES = 10 * 60 * 1000;

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
	// also costs an SES call). Keyed on the submitted email whether or not
	// it's registered, so the limit doesn't leak who's registered either.
	const withinLimits = allowHit(`email:${email.toLowerCase()}`, 3, TEN_MINUTES)
		&& allowHit(`ip:${clientIp(req)}`, 10, TEN_MINUTES);
	if (!withinLimits) {
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
