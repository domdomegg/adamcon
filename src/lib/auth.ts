import crypto from 'node:crypto';
import type {NextApiRequest, NextApiResponse} from 'next';
import {db, type UserRow} from './db';

const SESSION_COOKIE = 'adamcon_session';
const SESSION_DAYS = 60;
const LOGIN_TOKEN_MINUTES = 60;

const now = () => Math.floor(Date.now() / 1000);

export const createLoginToken = (userId: number): string => {
	const token = crypto.randomBytes(24).toString('base64url');
	db.prepare('INSERT INTO login_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
		.run(token, userId, now() + (LOGIN_TOKEN_MINUTES * 60));
	return token;
};

/** Exchanges a login token for a session token, or null if invalid/expired/used. */
export const consumeLoginToken = (token: string): string | null => {
	const row = db.prepare('SELECT user_id, expires_at, used FROM login_tokens WHERE token = ?')
		.get(token) as {user_id: number; expires_at: number; used: number} | undefined;
	if (!row || row.used || row.expires_at < now()) {
		return null;
	}

	db.prepare('UPDATE login_tokens SET used = 1 WHERE token = ?').run(token);
	const session = crypto.randomBytes(24).toString('base64url');
	db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
		.run(session, row.user_id, now() + (SESSION_DAYS * 24 * 60 * 60));
	return session;
};

export const sessionCookie = (session: string): string =>
	`${SESSION_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;

export const clearSessionCookie = (): string =>
	`${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export const getSessionUser = (req: NextApiRequest): UserRow | null => {
	const token = req.cookies[SESSION_COOKIE];
	if (!token) {
		return null;
	}

	const user = db.prepare(`
		SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token = ? AND s.expires_at > unixepoch()
	`).get(token) as UserRow | undefined;
	return user ?? null;
};

export const destroySession = (req: NextApiRequest): void => {
	const token = req.cookies[SESSION_COOKIE];
	if (token) {
		db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
	}
};

/** Wraps a handler that requires a signed-in user. */
export const withUser = (handler: (req: NextApiRequest, res: NextApiResponse, user: UserRow) => void | Promise<void>) => async (req: NextApiRequest, res: NextApiResponse) => {
	const user = getSessionUser(req);
	if (!user) {
		res.status(401).json({error: 'Not signed in'});
		return;
	}

	await handler(req, res, user);
};
