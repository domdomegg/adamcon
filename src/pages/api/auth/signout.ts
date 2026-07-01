import type {NextApiRequest, NextApiResponse} from 'next';
import {clearSessionCookie, destroySession} from '../../../lib/auth';

const handler = (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'POST') {
		res.status(405).end();
		return;
	}

	destroySession(req);
	res.setHeader('Set-Cookie', clearSessionCookie());
	res.status(200).json({ok: true});
};

export default handler;
