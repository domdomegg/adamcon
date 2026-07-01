import {withUser} from '../../lib/auth';
import {db} from '../../lib/db';
import {initials} from '../../lib/shape';

export default withUser((req, res, user) => {
	if (req.method === 'GET') {
		res.json({
			id: user.id,
			email: user.email,
			name: user.name,
			headline: user.headline,
			bio: user.bio,
			linkUrl: user.link_url,
			whatsapp: user.whatsapp,
			photoUrl: user.photo_url,
			initials: initials(user.name),
		});
		return;
	}

	if (req.method === 'PUT') {
		const body = req.body ?? {};
		const name = String(body.name ?? user.name).trim().slice(0, 100);
		if (!name) {
			res.status(400).json({error: 'Name is required'});
			return;
		}

		db.prepare(`
			UPDATE users SET name = ?, headline = ?, bio = ?, link_url = ?, whatsapp = ?, photo_url = ?
			WHERE id = ?
		`).run(
			name,
			String(body.headline ?? user.headline).slice(0, 140),
			String(body.bio ?? user.bio).slice(0, 2000),
			String(body.linkUrl ?? user.link_url).slice(0, 300),
			String(body.whatsapp ?? user.whatsapp).slice(0, 30),
			String(body.photoUrl ?? user.photo_url).slice(0, 500),
			user.id,
		);
		res.json({ok: true});
		return;
	}

	res.status(405).end();
});
