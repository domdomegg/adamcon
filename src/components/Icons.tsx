const base = {
	fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
} as const;

export const PeopleIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
		<circle cx='9' cy='7' r='4' />
		<path d='M23 21v-2a4 4 0 0 0-3-3.87' />
		<path d='M16 3.13a4 4 0 0 1 0 7.75' />
	</svg>
);

export const CalendarIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<rect x='3' y='4' width='18' height='18' rx='2' />
		<line x1='16' y1='2' x2='16' y2='6' />
		<line x1='8' y1='2' x2='8' y2='6' />
		<line x1='3' y1='10' x2='21' y2='10' />
	</svg>
);

export const UserIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
		<circle cx='12' cy='7' r='4' />
	</svg>
);

export const SearchIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<circle cx='11' cy='11' r='8' />
		<line x1='21' y1='21' x2='16.65' y2='16.65' />
	</svg>
);

export const LinkIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
		<path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
	</svg>
);

export const ChatIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z' />
	</svg>
);

export const CheckIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base} strokeWidth={2.6}>
		<polyline points='20 6 9 17 4 12' />
	</svg>
);

export const ClockIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base} strokeWidth={2.2}>
		<circle cx='12' cy='12' r='9' />
		<polyline points='12 7 12 12 15 14' />
	</svg>
);

export const MailIcon = ({className}: {className?: string}) => (
	<svg viewBox='0 0 24 24' className={className} {...base}>
		<path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
		<polyline points='22,6 12,13 2,6' />
	</svg>
);
