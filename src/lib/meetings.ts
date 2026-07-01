import {
	db, LIVE, type MeetingRow, type UserRow,
} from './db';
import {appOrigin, meetingIcs, sendEmail} from './email';
import {slotTime} from './slots';

const NUDGE_SECONDS = 3 * 60 * 60;

const liveIn = `('${LIVE.join('\', \'')}')`;

/** Free = not blocked, and no pending/accepted meeting in the slot. */
export const isFree = (userId: number, slotId: number): boolean => {
	const blocked = db.prepare('SELECT 1 FROM blocks WHERE user_id = ? AND slot_id = ?').get(userId, slotId);
	if (blocked) {
		return false;
	}

	const busy = db.prepare(`
		SELECT 1 FROM meetings
		WHERE slot_id = ? AND status IN ${liveIn} AND (requester_id = ? OR target_id = ?)
	`).get(slotId, userId, userId);
	return !busy;
};

export const getUser = (id: number): UserRow | null =>
	(db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined) ?? null;

export const getMeeting = (id: number): MeetingRow | null =>
	(db.prepare('SELECT * FROM meetings WHERE id = ?').get(id) as MeetingRow | undefined) ?? null;

/** Live meeting between two users, in either direction, if any. */
export const meetingBetween = (a: number, b: number): MeetingRow | null =>
	(db.prepare(`
		SELECT * FROM meetings WHERE status IN ${liveIn}
		AND ((requester_id = ? AND target_id = ?) OR (requester_id = ? AND target_id = ?))
	`).get(a, b, b, a) as MeetingRow | undefined) ?? null;

export const createRequest = (
	requester: UserRow,
	targetId: number,
	slotId: number,
	note: string,
): {ok: true; meeting: MeetingRow} | {ok: false; error: string} => {
	const result = db.transaction(() => {
		const target = getUser(targetId);
		if (!target || target.id === requester.id) {
			return {ok: false as const, error: 'Unknown person'};
		}

		if (!db.prepare('SELECT 1 FROM slots WHERE id = ?').get(slotId)) {
			return {ok: false as const, error: 'Unknown slot'};
		}

		if (meetingBetween(requester.id, targetId)) {
			return {ok: false as const, error: 'You already have a meeting or pending request with them'};
		}

		if (!isFree(requester.id, slotId) || !isFree(targetId, slotId)) {
			return {ok: false as const, error: 'That slot is no longer free for you both'};
		}

		const {lastInsertRowid} = db.prepare(`
			INSERT INTO meetings (slot_id, requester_id, target_id, note) VALUES (?, ?, ?, ?)
		`).run(slotId, requester.id, targetId, note.slice(0, 500));
		return {ok: true as const, meeting: getMeeting(Number(lastInsertRowid))!};
	})();

	if (result.ok) {
		void nudgeTarget(targetId);
	}

	return result;
};

/** Batched request notification: at most one email per NUDGE_SECONDS covering all unanswered requests. */
const nudgeTarget = async (targetId: number): Promise<void> => {
	const target = getUser(targetId);
	if (!target) {
		return;
	}

	const cutoff = Math.floor(Date.now() / 1000) - NUDGE_SECONDS;
	if (target.last_request_nudge_at > cutoff) {
		return;
	}

	const pending = db.prepare(`
		SELECT COUNT(*) AS n FROM meetings WHERE target_id = ? AND status = 'pending'
	`).get(targetId) as {n: number};
	db.prepare('UPDATE users SET last_request_nudge_at = unixepoch() WHERE id = ?').run(targetId);
	await sendEmail({
		to: target.email,
		subject: pending.n === 1 ? 'Someone wants to meet you at AdamCon' : `${pending.n} people want to meet you at AdamCon`,
		template: {
			heading: pending.n === 1 ? 'Someone wants to meet you' : `${pending.n} people want to meet you`,
			paragraphs: [`You have ${pending.n === 1 ? 'a meeting request' : `${pending.n} meeting requests`} waiting for an answer on your schedule.`],
			cta: {label: 'Answer on your schedule', url: `${appOrigin()}/schedule/`},
		},
	});
};

export const answerRequest = (
	user: UserRow,
	meetingId: number,
	action: 'accept' | 'decline' | 'withdraw' | 'cancel',
): {ok: true} | {ok: false; error: string} => {
	const result = db.transaction(() => {
		const meeting = getMeeting(meetingId);
		if (!meeting) {
			return {ok: false as const, error: 'Unknown meeting'};
		}

		const isTarget = meeting.target_id === user.id;
		const isRequester = meeting.requester_id === user.id;

		if (action === 'accept' || action === 'decline') {
			if (!isTarget || meeting.status !== 'pending') {
				return {ok: false as const, error: 'Nothing to answer'};
			}
		} else if (action === 'withdraw') {
			if (!isRequester || meeting.status !== 'pending') {
				return {ok: false as const, error: 'Nothing to withdraw'};
			}
		} else if (!(isTarget || isRequester) || meeting.status !== 'accepted') {
			return {ok: false as const, error: 'Nothing to cancel'};
		}

		const status = ({
			accept: 'accepted', decline: 'declined', withdraw: 'withdrawn', cancel: 'cancelled',
		} as const)[action];
		db.prepare('UPDATE meetings SET status = ?, updated_at = unixepoch() WHERE id = ?').run(status, meetingId);
		return {ok: true as const, meeting};
	})();

	if (!result.ok) {
		return result;
	}

	const {meeting} = result;
	const requester = getUser(meeting.requester_id)!;
	const target = getUser(meeting.target_id)!;
	const time = slotTime(meeting.slot_id);

	// Emails only when the other person's day changed. Declines and
	// withdrawals stay silent by design.
	if (action === 'accept') {
		void sendEmail({
			to: requester.email,
			subject: `${target.name} accepted — you're on at ${time}`,
			template: {
				heading: `${target.name} accepted`,
				paragraphs: ['Your meeting is booked. A calendar invite is attached.'],
				highlight: `${time} · Sat 1 Aug · meet at the water fountain`,
				cta: {label: 'View your schedule', url: `${appOrigin()}/schedule/`},
			},
			ics: meetingIcs(meeting.slot_id, requester.name, target.name),
		});
	}

	if (action === 'cancel') {
		const other = user.id === requester.id ? target : requester;
		void sendEmail({
			to: other.email,
			subject: `Your ${time} AdamCon meeting was cancelled`,
			template: {
				heading: `Your ${time} meeting was cancelled`,
				paragraphs: [`${user.name} cancelled your ${time} meeting. The slot is open again if you want to rebook it.`],
				cta: {label: 'Find someone for the slot', url: `${appOrigin()}/people/`},
			},
		});
	}

	return {ok: true};
};
