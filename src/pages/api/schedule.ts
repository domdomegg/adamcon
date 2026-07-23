import {withUser} from '../../lib/auth';
import {db, type MeetingRow} from '../../lib/db';
import {getUser} from '../../lib/meetings';
import {initials, waLink} from '../../lib/shape';
import {TIMELINE} from '../../lib/slots';

export type ScheduleRow = {
	time: string;
	slotId: number | null;
	kind: 'lunch' | 'free' | 'blocked' | 'meeting' | 'incoming' | 'outgoing';
	meeting?: {
		id: number;
		personId: number;
		name: string;
		firstName: string;
		photoUrl: string;
		initials: string;
		waLink: string | null;
		note: string;
		endTime: string;
	};
};

export default withUser((req, res, user) => {
	if (req.method === 'PUT') {
		// Toggle availability for a free slot. Booked slots have no toggle in
		// the UI; server-side, blocking is allowed regardless (it only affects
		// future bookings — existing meetings stay).
		const slotId = Number(req.body?.slotId);
		const available = Boolean(req.body?.available);
		if (!TIMELINE.some((t) => t.slotId === slotId)) {
			res.status(400).json({error: 'Unknown slot'});
			return;
		}

		if (available) {
			db.prepare('DELETE FROM blocks WHERE user_id = ? AND slot_id = ?').run(user.id, slotId);
		} else {
			db.prepare('INSERT OR IGNORE INTO blocks (user_id, slot_id) VALUES (?, ?)').run(user.id, slotId);
		}

		res.json({ok: true});
		return;
	}

	const live = db.prepare(`
		SELECT * FROM meetings WHERE status IN ('pending', 'accepted')
		AND (requester_id = ? OR target_id = ?)
	`).all(user.id, user.id) as MeetingRow[];
	const bySlot = new Map(live.map((m) => [m.slot_id, m]));
	const blocked = new Set((db.prepare('SELECT slot_id FROM blocks WHERE user_id = ?').all(user.id) as {slot_id: number}[])
		.map((b) => b.slot_id));

	const rows: ScheduleRow[] = TIMELINE.map(({time, slotId}) => {
		if (slotId === null) {
			return {time, slotId, kind: 'lunch'};
		}

		const m = bySlot.get(slotId);
		if (!m) {
			return {time, slotId, kind: blocked.has(slotId) ? 'blocked' : 'free'};
		}

		const otherId = m.requester_id === user.id ? m.target_id : m.requester_id;
		const other = getUser(otherId)!;
		const kind = m.status === 'accepted'
			? 'meeting' as const
			: (m.target_id === user.id ? 'incoming' as const : 'outgoing' as const);
		const [h, min] = time.split(':').map(Number);
		const end = (h * 60) + min + 25;
		return {
			time,
			slotId,
			kind,
			meeting: {
				id: m.id,
				personId: other.id,
				name: other.name,
				firstName: other.name.split(' ')[0],
				photoUrl: other.photo_url,
				initials: initials(other.name),
				waLink: waLink(other.whatsapp),
				note: m.note,
				endTime: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
			},
		};
	});

	res.json({
		rows,
		meetings: rows.filter((r) => r.kind === 'meeting').length,
		toAnswer: rows.filter((r) => r.kind === 'incoming').length,
	});
});
