import path from 'node:path';
import fs from 'node:fs';
import {withUser} from '../../../lib/auth';
import {db} from '../../../lib/db';

export const config = {
	api: {bodyParser: {sizeLimit: '4mb'}},
};

// Accepts a client-side-resized JPEG as a data URL and stores it on disk.
export default withUser((req, res, user) => {
	if (req.method !== 'POST') {
		res.status(405).end();
		return;
	}

	const dataUrl = String(req.body?.dataUrl ?? '');
	const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
	if (!match) {
		res.status(400).json({error: 'Expected a JPEG data URL'});
		return;
	}

	const buffer = Buffer.from(match[1], 'base64');
	if (buffer.length > 2 * 1024 * 1024) {
		res.status(400).json({error: 'Photo too large'});
		return;
	}

	const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
	const photosDir = path.join(dataDir, 'photos');
	fs.mkdirSync(photosDir, {recursive: true});
	fs.writeFileSync(path.join(photosDir, `${user.id}.jpg`), buffer);

	// Cache-bust with the update time so avatars refresh everywhere.
	const photoUrl = `/api/photos/${user.id}/?v=${Date.now()}`;
	db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(photoUrl, user.id);
	res.json({photoUrl});
});
