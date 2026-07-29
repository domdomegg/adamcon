/**
 * Renders sample versions of every email template to HTML files for design
 * review. Usage: npx tsx scripts/render-emails.ts <outdir>
 */
import fs from 'node:fs';
import path from 'node:path';
import {renderEmailHtml, type Template} from '../src/lib/emailTemplate';

const OUT = process.argv[2] ?? '../mockups/emails';

const SAMPLES: Record<string, Template> = {
	'1-invite': {
		heading: 'Your profile is ready',
		paragraphs: [
			'Hi Priya — AdamCon one-to-one booking is open.',
			'Your profile is prefilled from your registration. Sign in, give it a once-over, and start booking 25-minute conversations.',
		],
		cta: {label: 'Sign in and see who\'s coming', url: 'https://adamcon.adamjones.me/'},
	},
	'2-signin': {
		heading: 'Sign in',
		paragraphs: ['Tap the button to sign in to AdamCon. This link is just for you.'],
		cta: {label: 'Sign in', url: 'https://adamcon.adamjones.me/'},
	},
	'3-request': {
		heading: 'Priya Kapoor wants to meet you',
		paragraphs: ['“Saw you run silly events — I run a community organising tool and think there’s overlap.”'],
		highlight: '12:00 · Sat 1 Aug',
		cta: {label: 'Answer on your schedule', url: 'https://adamcon.adamjones.me/schedule/'},
	},
	'4-accepted': {
		heading: 'Tom Okafor accepted',
		highlight: '12:00 · Sat 1 Aug',
		paragraphs: ['Your 12:00 is booked. Keep going — your day has room for more.'],
		cta: {label: 'Book more meetings', url: 'https://adamcon.adamjones.me/people/'},
	},
	'5-cancelled': {
		heading: 'Your 14:00 meeting was cancelled',
		paragraphs: ['Tom Okafor cancelled your 14:00 meeting. The slot is open again if you want to rebook it.'],
		cta: {label: 'Find someone for the slot', url: 'https://adamcon.adamjones.me/people/'},
	},
	'6-declined': {
		heading: 'Tom Okafor declined your 12:00 request',
		paragraphs: ['That slot is free for you again. Try Tom Okafor at a different time, or find someone else for it.'],
		cta: {label: 'Pick another time', url: 'https://adamcon.adamjones.me/people/3/'},
	},
};

fs.mkdirSync(OUT, {recursive: true});
for (const [name, template] of Object.entries(SAMPLES)) {
	fs.writeFileSync(path.join(OUT, `${name}.html`), renderEmailHtml(template));
	console.log(`${name}.html`);
}
