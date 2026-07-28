import {withUser} from '../../lib/auth';
import {db} from '../../lib/db';
import {cleanLinkUrl, initials} from '../../lib/shape';

export default withUser((req, res, user) => {
	if (req.method === 'GET') {
		res.json({
			id: user.id,
			email: user.email,
			name: user.name,
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

		const linkUrl = cleanLinkUrl(String(body.linkUrl ?? user.link_url).slice(0, 300));
		if (linkUrl === null) {
			res.status(400).json({error: 'Link must be a web address (https://…)'});
			return;
		}

		// photo_url is deliberately not settable here — only the photo upload
		// handler writes it, so avatars can't point at arbitrary URLs.
		db.prepare(`
			UPDATE users SET name = ?, bio = ?, link_url = ?, whatsapp = ?
			WHERE id = ?
		`).run(
			name,
			String(body.bio ?? user.bio).slice(0, 2000),
			linkUrl,
			String(body.whatsapp ?? user.whatsapp).slice(0, 30),
			user.id,
		);
		res.json({ok: true});
		return;
	}

	res.status(405).end();
});
