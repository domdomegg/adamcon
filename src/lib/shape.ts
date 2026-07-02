import type {UserRow} from './db';

export type PublicUser = {
	id: number;
	name: string;
	headline: string;
	bio: string;
	linkUrl: string;
	photoUrl: string;
	waLink: string | null;
	initials: string;
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
	headline: user.headline,
	bio: user.bio,
	linkUrl: user.link_url,
	photoUrl: user.photo_url,
	waLink: waLink(user.whatsapp),
	initials: initials(user.name),
});
