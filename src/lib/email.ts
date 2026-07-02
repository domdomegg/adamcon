import path from 'node:path';
import fs from 'node:fs';
import {renderEmailHtml, renderEmailText, type Template} from './emailTemplate';

// Email policy: send only when the recipient must act or their day changed.
// Invite, sign-in link, each incoming request (with its details), and
// cancellation. Accepts show up on the schedule; declines and withdrawals
// send nothing. The morning-of schedule email is a separate script (README).

export type Email = {
	to: string;
	subject: string;
	template: Template;
};

const FROM = process.env.EMAIL_FROM;

const sleep = async (ms: number) => new Promise((resolve) => {
	setTimeout(resolve, ms);
});

// SES has no idempotency key, so a retry after an ambiguous failure can
// rarely double-send — better than silently dropping the email.
const withRetries = async (send: () => Promise<void>, delays: number[]): Promise<void> => {
	const [delay, ...rest] = delays;
	try {
		await send();
	} catch (error) {
		if (delay === undefined) {
			throw error;
		}

		await sleep(delay);
		await withRetries(send, rest);
	}
};

export const sendEmail = async (email: Email): Promise<void> => {
	if (FROM) {
		await withRetries(async () => sendViaSes(email), [500, 2000]);
		return;
	}

	// Dev mode: log and append to a local outbox instead of sending.
	const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
	fs.mkdirSync(dataDir, {recursive: true});
	fs.appendFileSync(path.join(dataDir, 'outbox.jsonl'), `${JSON.stringify({
		to: email.to, subject: email.subject, text: renderEmailText(email.template), at: new Date().toISOString(),
	})}\n`);

	console.log(`[email → ${email.to}] ${email.subject}\n${renderEmailText(email.template)}\n`);
};

const sendViaSes = async (email: Email): Promise<void> => {
	const {SESv2Client, SendEmailCommand} = await import('@aws-sdk/client-sesv2');
	// SES_ENDPOINT points at aws-ses-v2-local in dev (npm run start:emails),
	// exercising this real code path with a browsable inbox at that URL.
	const client = new SESv2Client(process.env.SES_ENDPOINT ? {
		endpoint: process.env.SES_ENDPOINT,
		region: 'aws-ses-v2-local',
		credentials: {accessKeyId: 'ANY_STRING', secretAccessKey: 'ANY_STRING'},
	} : {});
	await client.send(new SendEmailCommand({
		FromEmailAddress: FROM,
		Destination: {ToAddresses: [email.to]},
		Content: {
			Simple: {
				Subject: {Data: email.subject},
				Body: {
					Text: {Data: renderEmailText(email.template)},
					Html: {Data: renderEmailHtml(email.template)},
				},
			},
		},
	}));
};

export const appOrigin = (): string => process.env.APP_ORIGIN ?? 'http://localhost:3000';

