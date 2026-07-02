/**
 * Seeds the local database with the mockup cast for development.
 * Prints a sign-in link for each user. Usage: npm run seed
 */
import {db} from '../src/lib/db';
import {createLoginToken} from '../src/lib/auth';
import {appOrigin} from '../src/lib/email';

const CAST = [
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

const insert = db.prepare(`
	INSERT OR IGNORE INTO users (email, name, headline, bio, link_url, whatsapp)
	VALUES (?, ?, ?, ?, ?, ?)
`);

for (const person of CAST) {
	insert.run(person.email, person.name, person.headline, person.bio, person.link, person.whatsapp);
	const user = db.prepare('SELECT id FROM users WHERE email = ?').get(person.email) as {id: number};
	const token = createLoginToken(user.id);
	console.log(`${person.name.padEnd(18)} ${appOrigin()}/verify/?token=${token}`);
}

console.log('\nSeeded. Open a link above to sign in as that person.');
