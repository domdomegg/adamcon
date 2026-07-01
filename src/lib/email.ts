import path from 'node:path';
import fs from 'node:fs';
import {renderEmailHtml, renderEmailText, type Template} from './emailTemplate';

// Email policy (see PLAN.md): send only when the recipient must act or their
// day changed. Invite, sign-in link, incoming requests (batched), acceptance
// (with .ics), cancellation, and the morning-of schedule. Declines and
// withdrawals send nothing.

export type Email = {
	to: string;
	subject: string;
	template: Template;
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
		to: email.to, subject: email.subject, text: renderEmailText(email.template), at: new Date().toISOString(),
	})}\n`);

	console.log(`[email → ${email.to}] ${email.subject}\n${renderEmailText(email.template)}\n`);
};

const sendViaSes = async (email: Email): Promise<void> => {
	const {SESv2Client, SendEmailCommand} = await import('@aws-sdk/client-sesv2');
	const client = new SESv2Client({});
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

