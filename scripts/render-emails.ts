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
	'3-requests': {
		heading: '2 people want to meet you',
		paragraphs: ['You have 2 meeting requests waiting for an answer on your schedule.'],
		cta: {label: 'Answer on your schedule', url: 'https://adamcon.adamjones.me/schedule/'},
	},
	'4-accepted': {
		heading: 'Tom Okafor accepted',
		paragraphs: ['Your meeting is booked. A calendar invite is attached.'],
		highlight: '14:00 · Sat 1 Aug · meet at the water fountain',
		cta: {label: 'View your schedule', url: 'https://adamcon.adamjones.me/schedule/'},
	},
	'5-cancelled': {
		heading: 'Your 14:00 meeting was cancelled',
		paragraphs: ['Tom Okafor cancelled your 14:00 meeting. The slot is open again if you want to rebook it.'],
		cta: {label: 'Find someone for the slot', url: 'https://adamcon.adamjones.me/people/'},
	},
};

fs.mkdirSync(OUT, {recursive: true});
for (const [name, template] of Object.entries(SAMPLES)) {
	fs.writeFileSync(path.join(OUT, `${name}.html`), renderEmailHtml(template));
	console.log(`${name}.html`);
}
