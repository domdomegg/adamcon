import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import {SLOT_TIMES} from './slots';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY,
	email TEXT NOT NULL UNIQUE COLLATE NOCASE,
	name TEXT NOT NULL,
	headline TEXT NOT NULL DEFAULT '',
	bio TEXT NOT NULL DEFAULT '',
	link_url TEXT NOT NULL DEFAULT '',
	whatsapp TEXT NOT NULL DEFAULT '',
	photo_url TEXT NOT NULL DEFAULT '',
	airtable_record_id TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
	token TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id),
	expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_tokens (
	token TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id),
	expires_at INTEGER NOT NULL,
	used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS slots (
	id INTEGER PRIMARY KEY,
	starts TEXT NOT NULL
);

-- A row here means the user has blocked the slot off. Default is available.
CREATE TABLE IF NOT EXISTS blocks (
	user_id INTEGER NOT NULL REFERENCES users(id),
	slot_id INTEGER NOT NULL REFERENCES slots(id),
	PRIMARY KEY (user_id, slot_id)
);

CREATE TABLE IF NOT EXISTS meetings (
	id INTEGER PRIMARY KEY,
	slot_id INTEGER NOT NULL REFERENCES slots(id),
	requester_id INTEGER NOT NULL REFERENCES users(id),
	target_id INTEGER NOT NULL REFERENCES users(id),
	note TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'withdrawn')),
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS meetings_by_user ON meetings (requester_id, status);
CREATE INDEX IF NOT EXISTS meetings_by_target ON meetings (target_id, status);
`;

const open = (): Database.Database => {
	const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
	fs.mkdirSync(dataDir, {recursive: true});
	const database = new Database(path.join(dataDir, 'adamcon.db'));
	database.pragma('journal_mode = WAL');
	database.pragma('foreign_keys = ON');
	database.exec(SCHEMA);
	const seedSlot = database.prepare('INSERT OR IGNORE INTO slots (id, starts) VALUES (?, ?)');
	SLOT_TIMES.forEach((starts, i) => seedSlot.run(i + 1, starts));
	return database;
};

// Survive Next.js dev-mode hot reloads without leaking connections.
const globalForDb = globalThis as unknown as {__adamconDb?: Database.Database};
export const db: Database.Database = globalForDb.__adamconDb ?? open();
globalForDb.__adamconDb = db;

export type UserRow = {
	id: number;
	email: string;
	name: string;
	headline: string;
	bio: string;
	link_url: string;
	whatsapp: string;
	photo_url: string;
	airtable_record_id: string | null;
	created_at: number;
};

export type MeetingRow = {
	id: number;
	slot_id: number;
	requester_id: number;
	target_id: number;
	note: string;
	status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'withdrawn';
	created_at: number;
	updated_at: number;
};

/** Statuses that occupy a slot. */
export const LIVE = ['pending', 'accepted'] as const;
