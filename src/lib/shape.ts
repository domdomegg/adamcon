import type {UserRow} from './db';

export type PublicUser = {
	id: number;
	name: string;
	bio: string;
	linkUrl: string;
	photoUrl: string;
	waLink: string | null;
	initials: string;
};

/**
 * Normalises a profile link to an absolute http(s) URL, or null if it isn't
 * one. Bare domains get https:// prepended — without a scheme the browser
 * resolves the href relative to the current page, so "alexkingsley.xyz" on
 * /people/17/ silently becomes /people/17/alexkingsley.xyz. Anything else
 * (javascript:, data:, …) is rejected: these render as raw hrefs on other
 * attendees' screens, so a bad scheme here would be stored XSS.
 */
export const cleanLinkUrl = (value: string): string | null => {
	const trimmed = value.trim();
	if (!trimmed) {
		return '';
	}

	for (const [index, candidate] of [trimmed, `https://${trimmed}`].entries()) {
		try {
			const url = new URL(candidate);
			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				continue;
			}

			// Only trust the prepended form if what followed really was a bare
			// host. "mailto:a@b.com" parses as userinfo "mailto:a" on host
			// "b.com", so a mistyped email would otherwise turn into a link to
			// someone else's domain carrying credentials.
			if (index === 1 && (url.username || url.password || !url.hostname.includes('.'))) {
				continue;
			}

			return url.href;
		} catch {
			// Try the next candidate.
		}
	}

	return null;
};

export const waLink = (whatsapp: string): string | null => {
	const digits = whatsapp.replaceAll(/\D/g, '').replace(/^00/, '');
	// wa.me needs a country code; treat a remaining leading 0 as UK national
	// format ("07911 123456"), by far the most common free-text entry here.
	const normalized = digits.replace(/^0/, '44');
	return normalized.length >= 7 ? `https://wa.me/${normalized}` : null;
};

export const initials = (name: string): string =>
	name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

export const publicUser = (user: UserRow): PublicUser => ({
	id: user.id,
	name: user.name,
	bio: user.bio,
	// Normalise on read too: rows predating the write validator, and rows the
	// Airtable import wrote from free-text registration answers, can still hold
	// a scheme-less or unsafe value.
	linkUrl: cleanLinkUrl(user.link_url) ?? '',
	photoUrl: user.photo_url,
	waLink: waLink(user.whatsapp),
	initials: initials(user.name),
});
