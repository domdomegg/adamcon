/**
 * Dev tool: screenshots the running app as a signed-in user.
 * Usage: SESSION=<adamcon_session cookie> BASE=http://localhost:3001 npx tsx scripts/screenshot.ts <outdir>
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const SESSION = process.env.SESSION ?? '';
const OUT = process.argv[2] ?? '.';

const PAGES = [
	{name: 'login', path: '/login/', auth: false},
	{name: 'people', path: '/people/', auth: true},
	{name: 'book', path: '/people/3/', auth: true},
	{name: 'schedule', path: '/schedule/', auth: true},
	{name: 'profile', path: '/profile/', auth: true},
];

const main = async () => {
	const browser = await puppeteer.launch({
		executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		headless: true,
	});

	for (const viewport of [{name: 'mobile', width: 412, height: 915}, {name: 'desktop', width: 1440, height: 900}]) {
		const page = await browser.newPage();
		await page.setViewport({...viewport, deviceScaleFactor: 2});
		if (SESSION) {
			await browser.setCookie({
				name: 'adamcon_session', value: SESSION, domain: 'localhost', path: '/', httpOnly: true,
			});
		}

		for (const target of PAGES) {
			if (viewport.name === 'desktop' && target.name !== 'people' && target.name !== 'schedule') {
				continue;
			}

			await page.goto(`${BASE}${target.path}`, {waitUntil: 'networkidle0', timeout: 20_000});
			await new Promise((resolve) => {
				setTimeout(resolve, 400);
			});
			await page.screenshot({path: `${OUT}/app-${viewport.name}-${target.name}.png` as `${string}.png`});
			console.log(`app-${viewport.name}-${target.name}.png`);
		}

		await page.close();
	}

	await browser.close();
};

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
