import type {NextApiRequest, NextApiResponse} from 'next';
import {redeemLoginToken, sessionCookie} from '../../../lib/auth';

// Signs in directly from the emailed GET link — no confirm page needed. Safe
// against email link-scanners prefetching the link because tokens are
// redeemable more than once (see redeemLoginToken).
const handler = (req: NextApiRequest, res: NextApiResponse) => {
	const session = redeemLoginToken(String(req.query.token ?? ''));
	if (!session) {
		res.redirect('/login/?expired=1');
		return;
	}

	res.setHeader('Set-Cookie', sessionCookie(session));
	res.redirect('/people/');
};

export default handler;
