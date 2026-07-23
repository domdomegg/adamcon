import {useCallback, useEffect, useState} from 'react';
import Shell from '../components/Shell';
import Avatar from '../components/Avatar';
import Loading from '../components/Loading';
import {api} from '../lib/client';
import {WATER_FOUNTAIN_URL} from '../lib/slots';
import type {ScheduleRow} from './api/schedule';

type Schedule = {rows: ScheduleRow[]; meetings: number; toAnswer: number};

const EVENT_DAY = '2026-08-01';

const Toggle = ({on, disabled, onChange}: {on: boolean; disabled: boolean; onChange: () => void}) => (
	<button
		type='button'
		onClick={onChange}
		disabled={disabled}
		aria-label={on ? 'Block this slot' : 'Open this slot'}
		className={`w-11 h-[26px] rounded-full relative shrink-0 transition-colors disabled:opacity-60 ${on ? 'bg-accept' : 'bg-stone-300'}`}
	>
		<span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'right-[3px]' : 'left-[3px]'}`} />
	</button>
);

const nowLondon = (): {date: string; time: string} => {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
	}).formatToParts(new Date());
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return {date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}`};
};

const SchedulePage = () => {
	const [schedule, setSchedule] = useState<Schedule | null>(null);
	const [error, setError] = useState('');
	const [pending, setPending] = useState<string | null>(null);

	const load = useCallback(async () => {
		setSchedule(await api<Schedule>('/api/schedule'));
	}, []);

	useEffect(() => {
		void load();
		const interval = setInterval(() => {
			void load();
		}, 60_000);
		return () => {
			clearInterval(interval);
		};
	}, [load]);

	// After any failure (including a timeout where we never heard the outcome),
	// reload from the server — it's authoritative, and the buttons must never
	// stay disabled by a stuck pending state.
	const act = async (meetingId: number, action: string) => {
		setError('');
		setPending(`${action}-${meetingId}`);
		try {
			await api(`/api/meetings/${meetingId}`, {method: 'POST', body: JSON.stringify({action})});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		} finally {
			await load().catch(() => undefined);
			setPending(null);
		}
	};

	const toggle = async (slotId: number, available: boolean) => {
		setError('');
		setPending(`toggle-${slotId}`);
		try {
			await api('/api/schedule', {method: 'PUT', body: JSON.stringify({slotId, available})});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		} finally {
			await load().catch(() => undefined);
			setPending(null);
		}
	};

	if (!schedule) {
		return <Shell><Loading /></Shell>;
	}

	const now = nowLondon();
	const isEventDay = now.date === EVENT_DAY;
	// The row the "now" line sits above: first row starting after the current time.
	const nowIndex = isEventDay ? schedule.rows.findIndex((r) => r.time > now.time) : -1;

	return (
		<Shell badgeOverride={schedule.toAnswer}>
			<h1 className='text-xl font-extrabold text-brand-dark'>My day</h1>
			<p className='text-[13px] text-muted mb-3.5'>
				Sat 1 Aug · {schedule.meetings} meeting{schedule.meetings === 1 ? '' : 's'}
				{schedule.toAnswer > 0 && <> · {schedule.toAnswer} request{schedule.toAnswer === 1 ? '' : 's'} to answer</>}
			</p>

			<div className='bg-white border border-line rounded-2xl px-3.5 py-3 text-[13.5px] text-muted mb-4'>
				Every meeting starts at <a href={WATER_FOUNTAIN_URL} target='_blank' rel='noreferrer' className='text-brand font-bold'>the water fountain</a> — find each other there, then wander.
			</div>

			{error && <p className='text-brand-dark text-[13px] mb-3'>{error}</p>}

			<div>
				{schedule.rows.map((row, i) => (
					<div key={row.time} className='relative flex gap-2.5 mb-2.5'>
						{i === nowIndex && (
							<div className='absolute inset-x-0 -top-[7px] border-t-2 border-brand z-10'>
								<span className='absolute -top-[9px] left-0 bg-brand text-white text-[10px] font-extrabold rounded-md px-1.5 py-0.5'>now</span>
							</div>
						)}
						<div className='w-11 shrink-0 text-right text-[13px] font-bold text-muted pt-3.5'>{row.time}</div>

						<div className='flex-1 min-w-0'>
							{row.kind === 'lunch' && (
								<div className='border-[1.5px] border-dashed border-line rounded-2xl px-3.5 py-[13px] text-[13.5px] text-muted'>
									{row.time === '12:30' ? 'Lunch — everyone breaks together' : 'Lunch'}
								</div>
							)}

							{(row.kind === 'free' || row.kind === 'blocked') && (
								<div className={`border-[1.5px] border-dashed border-line rounded-2xl px-3.5 py-[10px] text-[13.5px] text-muted flex items-center justify-between gap-2 ${row.kind === 'blocked' ? 'opacity-75' : ''}`}>
									<span>
										{row.kind === 'free' ? <>Free · <a href={`/people/?freeAt=${row.slotId}`} className='text-brand font-bold'>find someone ›</a></> : 'Blocked'}
									</span>
									<Toggle
										on={row.kind === 'free'}
										disabled={pending === `toggle-${row.slotId}`}
										onChange={() => {
											void toggle(row.slotId!, row.kind === 'blocked');
										}}
									/>
								</div>
							)}

							{row.kind === 'meeting' && row.meeting && (
								<a
									href={`/people/${row.meeting.personId}/?from=schedule`}
									className='block w-full text-left bg-white border border-line rounded-2xl p-3.5'
								>
									<div className='flex items-center gap-3'>
										<Avatar id={row.meeting.personId} initials={row.meeting.initials} photoUrl={row.meeting.photoUrl} />
										<div className='flex-1 min-w-0'>
											<div className='font-bold text-[16px]'>{row.meeting.name}</div>
										</div>
										<span className='text-stone-300 text-[19px] font-bold'>›</span>
									</div>
									{row.meeting.note && <p className='text-[12.5px] text-muted mt-2'>“{row.meeting.note}”</p>}
								</a>
							)}

							{row.kind === 'incoming' && row.meeting && (
								<div className='bg-tint-soft border-[1.5px] border-brand rounded-2xl p-3.5'>
									<a href={`/people/${row.meeting.personId}/?from=schedule`} className='flex items-center gap-3'>
										<Avatar id={row.meeting.personId} initials={row.meeting.initials} photoUrl={row.meeting.photoUrl} />
										<div className='flex-1 min-w-0'>
											<div className='font-bold text-[16px]'>{row.meeting.name}</div>
											<div className='text-[13px] text-muted'>wants to meet you</div>
										</div>
										<span className='bg-brand text-white text-[11px] font-extrabold uppercase tracking-wide rounded-full px-2.5 py-1'>new</span>
									</a>
									{row.meeting.note && <p className='text-[12.5px] text-muted mt-2'>“{row.meeting.note}”</p>}
									<div className='flex gap-2 mt-3'>
										<button
											type='button'
											disabled={pending !== null}
											onClick={() => {
												void act(row.meeting!.id, 'accept');
											}}
											className='flex-1 bg-accept text-white rounded-[10px] py-2.5 text-sm font-bold disabled:opacity-60'
										>
											{pending === `accept-${row.meeting.id}` ? 'Accepting…' : 'Accept'}
										</button>
										<button
											type='button'
											disabled={pending !== null}
											onClick={() => {
												void act(row.meeting!.id, 'decline');
											}}
											className='flex-1 bg-stone-100 text-muted rounded-[10px] py-2.5 text-sm font-bold disabled:opacity-60'
										>
											{pending === `decline-${row.meeting.id}` ? 'Declining…' : 'Decline'}
										</button>
									</div>
								</div>
							)}

							{row.kind === 'outgoing' && row.meeting && (
								<div className='border-[1.5px] border-dashed border-line rounded-2xl px-3.5 py-[10px] text-[13.5px] text-muted flex items-center justify-between gap-2'>
									<a href={`/people/${row.meeting.personId}/?from=schedule`} className='flex items-center gap-2'>
										<Avatar id={row.meeting.personId} initials={row.meeting.initials} photoUrl={row.meeting.photoUrl} size='sm' />
										You asked {row.meeting.firstName} — waiting
									</a>
									<button
										type='button'
										disabled={pending !== null}
										onClick={() => {
											void act(row.meeting!.id, 'withdraw');
										}}
										className='text-brand font-bold text-[13px] disabled:opacity-60'
									>
										{pending === `withdraw-${row.meeting.id}` ? 'withdrawing…' : 'withdraw'}
									</button>
								</div>
							)}
						</div>
					</div>
				))}
			</div>

		</Shell>
	);
};

export default SchedulePage;
