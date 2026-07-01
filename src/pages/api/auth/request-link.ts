import type {NextApiRequest, NextApiResponse} from 'next';
import {db, type UserRow} from '../../../lib/db';
import {createLoginToken} from '../../../lib/auth';
import {appOrigin, sendEmail} from '../../../lib/email';

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

	const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
	if (user) {
		const token = createLoginToken(user.id);
		await sendEmail({
			to: user.email,
			subject: 'Your AdamCon sign-in link',
			template: {
				heading: 'Sign in',
				paragraphs: ['Tap the button to sign in to AdamCon. This link is just for you.'],
				cta: {label: 'Sign in', url: `${appOrigin()}/api/auth/verify?token=${token}`},
			},
		});
	}

	// Same response either way, so the endpoint doesn't leak who's registered.
	res.status(200).json({ok: true});
};

export default handler;
