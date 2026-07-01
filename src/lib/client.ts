// Browser-side fetch helper. On 401 we bounce to the sign-in page.
export const api = async <T = unknown>(path: string, options?: RequestInit): Promise<T> => {
	const res = await fetch(path, {
		headers: {'Content-Type': 'application/json'},
		...options,
	});
	if (res.status === 401) {
		window.location.href = '/login/';
		throw new Error('Not signed in');
	}

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as {error?: string}).error ?? 'Something went wrong');
	}

	return data as T;
};

export const AVATAR_COLORS = [
	'#d1785c',
	'#5c8ad1',
	'#7a5cd1',
	'#4d9e83',
	'#c2586f',
	'#b08a3e',
	'#557d8a',
	'#8a6f5c',
];

export const avatarColor = (id: number): string => AVATAR_COLORS[id % AVATAR_COLORS.length];
