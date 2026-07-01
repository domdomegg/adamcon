import type {NextApiRequest, NextApiResponse} from 'next';
import {consumeLoginToken, sessionCookie} from '../../../lib/auth';

const handler = (req: NextApiRequest, res: NextApiResponse) => {
	const session = consumeLoginToken(String(req.query.token ?? ''));
	if (!session) {
		res.redirect('/login/?expired=1');
		return;
	}

	res.setHeader('Set-Cookie', sessionCookie(session));
	res.redirect('/people/');
};

export default handler;
