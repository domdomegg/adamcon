import path from 'node:path';
import fs from 'node:fs';
import {EVENT_DATE, slotEnd, slotTime} from './slots';
import {renderEmailHtml, renderEmailText, type Template} from './emailTemplate';

// Email policy (see PLAN.md): send only when the recipient must act or their
// day changed. Invite, sign-in link, incoming requests (batched), acceptance
// (with .ics), cancellation, and the morning-of schedule. Declines and
// withdrawals send nothing.

export type Email = {
	to: string;
	subject: string;
	template: Template;
	ics?: string;
};

const FROM = process.env.EMAIL_FROM;

export const sendEmail = async (email: Email): Promise<void> => {
	if (FROM) {
		await sendViaSes(email);
		return;
	}

	// Dev mode: log and append to a local outbox instead of sending.
	const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
	fs.mkdirSync(dataDir, {recursive: true});
	fs.appendFileSync(path.join(dataDir, 'outbox.jsonl'), `${JSON.stringify({
		to: email.to, subject: email.subject, text: renderEmailText(email.template), ics: email.ics, at: new Date().toISOString(),
	})}\n`);

	console.log(`[email → ${email.to}] ${email.subject}\n${renderEmailText(email.template)}\n`);
};

const sendViaSes = async (email: Email): Promise<void> => {
	// Raw MIME: multipart/alternative (text + html), wrapped in
	// multipart/mixed when there's an .ics attachment.
	const {SESv2Client, SendEmailCommand} = await import('@aws-sdk/client-sesv2');
	const client = new SESv2Client({});
	const alt = 'adamcon-alt';
	const mixed = 'adamcon-mixed';

	const alternative = [
		`--${alt}`,
		'Content-Type: text/plain; charset=UTF-8',
		'',
		renderEmailText(email.template),
		`--${alt}`,
		'Content-Type: text/html; charset=UTF-8',
		'',
		renderEmailHtml(email.template),
		`--${alt}--`,
	];

	const headers = [
		`From: ${FROM}`,
		`To: ${email.to}`,
		`Subject: ${email.subject}`,
		'MIME-Version: 1.0',
	];

	const parts = email.ics
		? [
			...headers,
			`Content-Type: multipart/mixed; boundary="${mixed}"`,
			'',
			`--${mixed}`,
			`Content-Type: multipart/alternative; boundary="${alt}"`,
			'',
			...alternative,
			`--${mixed}`,
			'Content-Type: text/calendar; method=REQUEST; charset=UTF-8',
			'Content-Disposition: attachment; filename="meeting.ics"',
			'',
			email.ics,
			`--${mixed}--`,
			'',
		]
		: [
			...headers,
			`Content-Type: multipart/alternative; boundary="${alt}"`,
			'',
			...alternative,
			'',
		];

	await client.send(new SendEmailCommand({
		FromEmailAddress: FROM,
		Destination: {ToAddresses: [email.to]},
		Content: {Raw: {Data: Buffer.from(parts.join('\r\n'))}},
	}));
};

export const appOrigin = (): string => process.env.APP_ORIGIN ?? 'http://localhost:3000';

export const meetingIcs = (slotId: number, a: string, b: string): string => {
	const date = EVENT_DATE.replaceAll('-', '');
	const start = slotTime(slotId).replace(':', '');
	const end = slotEnd(slotId).replace(':', '');
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//AdamCon//EN',
		'BEGIN:VEVENT',
		`UID:adamcon-${slotId}-${a}-${b}@adamjones.me`.replaceAll(/\s/g, '-'),
		`DTSTART;TZID=Europe/London:${date}T${start}00`,
		`DTEND;TZID=Europe/London:${date}T${end}00`,
		`SUMMARY:AdamCon: ${a} × ${b}`,
		'LOCATION:Water fountain, Granary Square canal towpath, King\'s Cross',
		'END:VEVENT',
		'END:VCALENDAR',
	].join('\r\n');
};
