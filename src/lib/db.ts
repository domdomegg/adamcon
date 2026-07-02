import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
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
	expires_at INTEGER NOT NULL
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

const DEV_CAST = [
	{
		name: 'Adam Jones', email: 'adam@example.com', headline: 'Software engineer · host of silly events', bio: 'I\'m the Adam in AdamCon — I organise this thing. This year I\'m hoping to meet people building interesting tools, and to introduce attendees who should obviously already know each other.', link: 'https://adamjones.me', whatsapp: '+44 7911 000001',
	},
	{
		name: 'Priya Kapoor', email: 'priya@example.com', headline: 'Building tools for community organisers', bio: 'Civic tech founder, boulderer, occasional zine-maker.', link: 'https://example.com/priya', whatsapp: '+44 7911 000002',
	},
	{
		name: 'Tom Okafor', email: 'tom@example.com', headline: 'Narrowboat liveaboard · ex-fintech', bio: 'Sold his flat in 2023, bought The Drifting Ledger, and has strong opinions about mooring politics and interchange fees. Ask him about either.', link: 'https://linkedin.com/in/tomokafor', whatsapp: '+44 7911 000003',
	},
	{
		name: 'Marta Reyes', email: 'marta@example.com', headline: 'Biosecurity researcher, terrible juggler', bio: 'Works on lab safety policy. Learning to juggle, badly.', link: '', whatsapp: '+44 7911 000004',
	},
	{
		name: 'Jonty Whitehouse', email: 'jonty@example.com', headline: 'Making museums less boring', bio: 'Exhibition designer and amateur theatre nerd.', link: '', whatsapp: '',
	},
	{
		name: 'Sasha Dubrovsky', email: 'sasha@example.com', headline: 'Robotics PhD · pun enthusiast', bio: 'Builds robot arms; collects terrible puns.', link: '', whatsapp: '+44 7911 000006',
	},
	{
		name: 'Elena Fontaine', email: 'elena@example.com', headline: 'Chef turned climate founder', bio: 'Ran a kitchen for a decade, now fighting food waste at scale. Wild swimmer.', link: '', whatsapp: '+44 7911 000007',
	},
	{
		name: 'Rafael Braga', email: 'rafael@example.com', headline: 'Teaches maths, writes musicals', bio: 'Secondary school maths teacher with a musical about Euler in progress.', link: '', whatsapp: '',
	},
];

/** Seeds the mockup cast, printing an email + sign-in link per person. */
const seedDevCast = (database: Database.Database) => {
	const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
	const insertUser = database.prepare(`
		INSERT INTO users (email, name, headline, bio, link_url, whatsapp)
		VALUES (?, ?, ?, ?, ?, ?)
	`);
	// Same shape as createLoginToken in auth.ts, which can't be imported here
	// without a dependency cycle.
	const insertToken = database.prepare('INSERT INTO login_tokens (token, user_id, expires_at) VALUES (?, ?, ?)');

	console.log('Empty dev database — seeding the mockup cast:');
	database.transaction(() => {
		for (const person of DEV_CAST) {
			const {lastInsertRowid} = insertUser.run(person.email, person.name, person.headline, person.bio, person.link, person.whatsapp);
			const token = crypto.randomBytes(24).toString('base64url');
			insertToken.run(token, lastInsertRowid, Math.floor(Date.now() / 1000) + (60 * 60));
			console.log(`  ${person.name.padEnd(18)} ${person.email.padEnd(20)} ${origin}/api/auth/verify/?token=${token}`);
		}
	})();
};

const open = (): Database.Database => {
	const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
	fs.mkdirSync(dataDir, {recursive: true});
	const database = new Database(path.join(dataDir, 'adamcon.db'));
	database.pragma('journal_mode = WAL');
	database.pragma('foreign_keys = ON');
	database.exec(SCHEMA);
	const seedSlot = database.prepare('INSERT OR IGNORE INTO slots (id, starts) VALUES (?, ?)');
	SLOT_TIMES.forEach((starts, i) => seedSlot.run(i + 1, starts));
	// Specifically 'development' (set by next dev), NOT "anything
	// non-production": scripts like the Airtable import run with NODE_ENV
	// unset, and must never seed fake people into an empty real database.
	if (process.env.NODE_ENV === 'development' && !database.prepare('SELECT 1 FROM users LIMIT 1').get()) {
		seedDevCast(database);
	}

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
