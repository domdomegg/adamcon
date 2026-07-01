import {withUser} from '../../../lib/auth';
import {answerRequest} from '../../../lib/meetings';

const ACTIONS = ['accept', 'decline', 'withdraw', 'cancel'] as const;

export default withUser((req, res, user) => {
	if (req.method !== 'POST') {
		res.status(405).end();
		return;
	}

	const action = String(req.body?.action ?? '') as typeof ACTIONS[number];
	if (!ACTIONS.includes(action)) {
		res.status(400).json({error: 'Unknown action'});
		return;
	}

	const result = answerRequest(user, Number(req.query.id), action);
	if (!result.ok) {
		res.status(409).json({error: result.error});
		return;
	}

	res.json({ok: true});
});
