import {withUser} from '../../../lib/auth';
import {createRequest} from '../../../lib/meetings';

export default withUser((req, res, user) => {
	if (req.method !== 'POST') {
		res.status(405).end();
		return;
	}

	const targetId = Number(req.body?.targetId);
	const slotId = Number(req.body?.slotId);
	const note = String(req.body?.note ?? '');
	if (!targetId || !slotId) {
		res.status(400).json({error: 'targetId and slotId are required'});
		return;
	}

	const result = createRequest(user, targetId, slotId, note);
	if (!result.ok) {
		res.status(409).json({error: result.error});
		return;
	}

	res.status(201).json({ok: true, meetingId: result.meeting.id});
});
