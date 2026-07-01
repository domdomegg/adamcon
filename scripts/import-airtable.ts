/**
 * Idempotent import from the AdamCon Airtable base into the app database,
 * sending a magic-link invite to each newly created account and writing
 * status back to Airtable so it stays the source of truth for who's in.
 *
 * Usage: AIRTABLE_API_KEY=pat... APP_ORIGIN=https://adamcon.adamjones.me npm run import
 * Rerun any time — existing users (matched on email) are skipped.
 */
/* eslint-disable no-await-in-loop -- sequential on purpose: gentle on Airtable rate limits */
import {db, type UserRow} from '../src/lib/db';
import {createLoginToken} from '../src/lib/auth';
import {appOrigin, sendEmail} from '../src/lib/email';

const BASE_ID = process.env.AIRTABLE_BASE_ID ?? 'appNMfArZZ49tEtzH';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID ?? 'tblFgTD5bua4ZXvod'; // 2026 People
const INVITED_FIELD = 'Sent swapcard onboarding email'; // reused as "invited to app"

type AirtableRecord = {
	id: string;
	fields: Record<string, unknown>;
};

const airtable = async (path: string, init?: RequestInit): Promise<any> => {
	const key = process.env.AIRTABLE_API_KEY;
	if (!key) {
		throw new Error('Set AIRTABLE_API_KEY (a personal access token with data.records read/write on the AdamCon base)');
	}

	const res = await fetch(`https://api.airtable.com/v0/${path}`, {
		...init,
		headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init?.headers},
	});
	if (!res.ok) {
		throw new Error(`Airtable ${res.status}: ${await res.text()}`);
	}

	return res.json();
};

const listAll = async (): Promise<AirtableRecord[]> => {
	const records: AirtableRecord[] = [];
	let offset: string | undefined;
	do {
		const page = await airtable(`${BASE_ID}/${TABLE_ID}?pageSize=100${offset ? `&offset=${offset}` : ''}`);
		records.push(...page.records);
		offset = page.offset;
	} while (offset);

	return records;
};

const main = async () => {
	const records = await listAll();
	console.log(`Airtable: ${records.length} registrations`);

	for (const record of records) {
		const f = record.fields as Record<string, string | boolean | undefined>;
		const email = String(f.Email ?? '').trim();
		const name = String(f['Full name'] ?? '').trim();
		if (!email || !name) {
			console.log(`- skipping ${record.id}: missing name or email`);
			continue;
		}

		const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
		if (existing) {
			console.log(`- ${name}: already imported`);
			continue;
		}

		const bio = String(f['Combined Bio'] ?? '').trim();
		const {lastInsertRowid} = db.prepare(`
			INSERT INTO users (email, name, bio, link_url, whatsapp, airtable_record_id)
			VALUES (?, ?, ?, ?, ?, ?)
		`).run(
			email,
			name,
			bio,
			String(f['LinkedIn or website explaining who you are'] ?? '').trim(),
			String(f['WhatsApp number'] ?? '').trim(),
			record.id,
		);

		const token = createLoginToken(Number(lastInsertRowid));
		await sendEmail({
			to: email,
			subject: 'Your AdamCon ’26 profile is ready',
			text: `Hi ${name.split(' ')[0]},\n\nAdamCon one-to-one booking is open. Your profile is prefilled from your registration — tap to sign in, check it, and start booking 25-minute conversations:\n\n${appOrigin()}/api/auth/verify?token=${token}\n\nSat 1 Aug, 11:00–18:00, Granary Square, King's Cross.\n`,
		});

		await airtable(`${BASE_ID}/${TABLE_ID}`, {
			method: 'PATCH',
			body: JSON.stringify({records: [{id: record.id, fields: {[INVITED_FIELD]: true}}]}),
		});
		console.log(`+ ${name}: imported and invited`);
	}
};

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
