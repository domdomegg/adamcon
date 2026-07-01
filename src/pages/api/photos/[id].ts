import path from 'node:path';
import fs from 'node:fs';
import type {NextApiRequest, NextApiResponse} from 'next';

// Photos aren't sensitive (they're shown to all attendees), so this endpoint
// doesn't require a session — that also lets email clients and the login
// page load avatars if we ever want that.
const handler = (req: NextApiRequest, res: NextApiResponse) => {
	const id = Number(req.query.id);
	if (!Number.isInteger(id) || id <= 0) {
		res.status(400).end();
		return;
	}

	const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
	const file = path.join(dataDir, 'photos', `${id}.jpg`);
	if (!fs.existsSync(file)) {
		res.status(404).end();
		return;
	}

	res.setHeader('Content-Type', 'image/jpeg');
	res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
	res.send(fs.readFileSync(file));
};

export default handler;
