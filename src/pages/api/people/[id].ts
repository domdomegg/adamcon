import {withUser} from '../../../lib/auth';
import {getUser, isFree, meetingBetween} from '../../../lib/meetings';
import {publicUser} from '../../../lib/shape';
import {TIMELINE} from '../../../lib/slots';

export type BookRow = {
	time: string;
	slotId: number | null;
	state: 'free' | 'lunch' | 'you' | 'them';
	label: string;
};

export default withUser((req, res, user) => {
	const target = getUser(Number(req.query.id));
	if (!target) {
		res.status(404).json({error: 'Unknown person'});
		return;
	}

	const firstName = target.name.split(' ')[0];
	const rows: BookRow[] = TIMELINE.map(({time, slotId}) => {
		if (slotId === null) {
			return {
				time, slotId, state: 'lunch', label: 'lunch',
			};
		}

		if (!isFree(user.id, slotId)) {
			return {
				time, slotId, state: 'you', label: 'you\'re busy',
			};
		}

		if (!isFree(target.id, slotId)) {
			return {
				time, slotId, state: 'them', label: `${firstName}'s booked`,
			};
		}

		return {
			time, slotId, state: 'free', label: '',
		};
	});

	const existing = meetingBetween(user.id, target.id);
	res.json({
		person: publicUser(target),
		isMe: target.id === user.id,
		rows,
		existing: existing ? {status: existing.status, time: TIMELINE.find((t) => t.slotId === existing.slot_id)?.time} : null,
	});
});
