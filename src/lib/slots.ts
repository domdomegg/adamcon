// The event: Sat 1 Aug 2026, 11:00-18:00 Europe/London.
// 14 half-hour rows; lunch (12:30, 13:00) is fixed for everyone and is not a
// bookable slot, leaving 12 slots. Meetings run 25 minutes; the spare 5 is
// walking time.

export const EVENT_DATE = '2026-08-01';

/** The meeting point, pinned on the AdamCon map (from the blog post). */
export const WATER_FOUNTAIN_URL = 'https://www.google.com/maps/d/viewer?mid=1WyIr0tsTFeTqdkjjl6wXg8WCAYCJGd4';
export const MEETING_MINUTES = 25;

export const SLOT_TIMES = [
	'11:00',
	'11:30',
	'12:00',
	'13:30',
	'14:00',
	'14:30',
	'15:00',
	'15:30',
	'16:00',
	'16:30',
	'17:00',
	'17:30',
] as const;

export const LUNCH_TIMES = ['12:30', '13:00'] as const;

/** All 14 rows in display order, lunch included. */
export const TIMELINE: {time: string; slotId: number | null}[] = [
	...SLOT_TIMES.slice(0, 3).map((time, i) => ({time, slotId: i + 1})),
	...LUNCH_TIMES.map((time) => ({time, slotId: null})),
	...SLOT_TIMES.slice(3).map((time, i) => ({time, slotId: i + 4})),
];

export const slotTime = (slotId: number): string => SLOT_TIMES[slotId - 1];

export const slotEnd = (slotId: number): string => {
	const [h, m] = slotTime(slotId).split(':').map(Number);
	const end = (h * 60) + m + MEETING_MINUTES;
	return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
};
