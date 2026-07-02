import {withUser} from '../../../lib/auth';
import {db, type MeetingRow, type UserRow} from '../../../lib/db';
import {isFree} from '../../../lib/meetings';
import {initials} from '../../../lib/shape';
import {SLOT_TIMES, slotTime} from '../../../lib/slots';

export type PersonCard = {
	id: number;
	name: string;
	headline: string;
	bio: string;
	photoUrl: string;
	initials: string;
	isMe: boolean;
	status: 'none' | 'requested' | 'booked';
	time: string | null;
	note: string | null;
};

export default withUser((req, res, user) => {
	// Ignore invalid slot ids (crafted or stale URLs) rather than filtering by
	// a slot that doesn't exist and returning a count that lies.
	const rawFreeAt = Number(req.query.freeAt);
	const freeAt = Number.isInteger(rawFreeAt) && rawFreeAt >= 1 && rawFreeAt <= SLOT_TIMES.length ? rawFreeAt : null;
	const users = db.prepare('SELECT * FROM users ORDER BY name').all() as UserRow[];
	const live = db.prepare(`
		SELECT * FROM meetings WHERE status IN ('pending', 'accepted')
		AND (requester_id = ? OR target_id = ?)
	`).all(user.id, user.id) as MeetingRow[];
	const byOther = new Map(live.map((m) => [m.requester_id === user.id ? m.target_id : m.requester_id, m]));

	const people: PersonCard[] = users
		// The freeAt filter is a booking aid, so it hides anyone unbookable:
		// you, anyone busy then, or anyone you already have a meeting/ask with.
		.filter((u) => (freeAt ? (u.id !== user.id && isFree(u.id, freeAt) && !byOther.get(u.id)) : true))
		.map((u) => {
			const meeting = byOther.get(u.id);
			return {
				id: u.id,
				name: u.name,
				headline: u.headline,
				bio: u.bio,
				photoUrl: u.photo_url,
				initials: initials(u.name),
				isMe: u.id === user.id,
				status: !meeting ? 'none' as const : (meeting.status === 'accepted' ? 'booked' as const : 'requested' as const),
				time: meeting ? slotTime(meeting.slot_id) : null,
				note: meeting?.status === 'accepted' && meeting.note ? meeting.note : null,
			};
		});

	// People you haven't booked first, then pending, then booked, you last.
	const rank = (p: PersonCard) => (p.isMe ? 3 : {none: 0, requested: 1, booked: 2}[p.status]);
	people.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
	res.json({people, freeAt: freeAt ? slotTime(freeAt) : null});
});
