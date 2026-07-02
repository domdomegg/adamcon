import type {NextApiRequest, NextApiResponse} from 'next';
import {consumeLoginToken, sessionCookie} from '../../../lib/auth';

// Consuming the single-use token requires a POST (from the /verify/ page's
// button): email link-scanners prefetch GETs, and a scanner eating the token
// would lock the actual human out.
const handler = (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'POST') {
		// Old emailed links pointed GETs here; send them to the confirm page.
		res.redirect(`/verify/?token=${encodeURIComponent(String(req.query.token ?? ''))}`);
		return;
	}

	const session = consumeLoginToken(String(req.body?.token ?? ''));
	if (!session) {
		res.status(400).json({error: 'expired'});
		return;
	}

	res.setHeader('Set-Cookie', sessionCookie(session));
	res.status(200).json({ok: true});
};

export default handler;
