import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import Shell from '../components/Shell';
import Avatar from '../components/Avatar';
import {ChatIcon} from '../components/Icons';
import {api} from '../lib/client';
import {WATER_FOUNTAIN_URL} from '../lib/slots';
import type {ScheduleRow} from './api/schedule';

type Schedule = {rows: ScheduleRow[]; meetings: number; toAnswer: number};

const EVENT_DAY = '2026-08-01';

const Toggle = ({on, onChange}: {on: boolean; onChange: () => void}) => (
	<button
		type='button'
		onClick={onChange}
		aria-label={on ? 'Block this slot' : 'Open this slot'}
		className={`w-11 h-[26px] rounded-full relative shrink-0 transition-colors ${on ? 'bg-accept' : 'bg-stone-300'}`}
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
	const [sheet, setSheet] = useState<ScheduleRow | null>(null);
	const [error, setError] = useState('');

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

	const act = async (meetingId: number, action: string) => {
		setError('');
		try {
			await api(`/api/meetings/${meetingId}`, {method: 'POST', body: JSON.stringify({action})});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		}

		setSheet(null);
		await load();
	};

	const toggle = async (slotId: number, available: boolean) => {
		await api('/api/schedule', {method: 'PUT', body: JSON.stringify({slotId, available})});
		await load();
	};

	if (!schedule) {
		return <Shell><div /></Shell>;
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

			<div className='relative pl-16'>
				{schedule.rows.map((row, i) => (
					<div key={row.time} className='relative mb-2.5'>
						{i === nowIndex && (
							<div className='absolute -left-16 right-0 -top-[7px] border-t-2 border-brand z-10'>
								<span className='absolute -top-[9px] left-0 bg-brand text-white text-[10px] font-extrabold rounded-md px-1.5 py-0.5'>now</span>
							</div>
						)}
						<div className='absolute -left-16 w-[52px] text-right text-[13px] font-bold text-muted pt-3.5'>{row.time}</div>

						{row.kind === 'lunch' && (
							<div className='border-[1.5px] border-dashed border-line rounded-2xl px-3.5 py-[13px] text-[13.5px] text-muted'>
								{row.time === '12:30' ? 'Lunch — everyone breaks together' : 'Lunch'}
							</div>
						)}

						{(row.kind === 'free' || row.kind === 'blocked') && (
							<div className={`border-[1.5px] border-dashed border-line rounded-2xl px-3.5 py-[10px] text-[13.5px] text-muted flex items-center justify-between gap-2 ${row.kind === 'blocked' ? 'opacity-75' : ''}`}>
								<span>
									{row.kind === 'free' ? <>Free · <Link href={`/people/?freeAt=${row.slotId}`} className='text-brand font-bold'>find someone ›</Link></> : 'Blocked'}
								</span>
								<Toggle on={row.kind === 'free'} onChange={() => {
									void toggle(row.slotId!, row.kind === 'blocked');
								}} />
							</div>
						)}

						{row.kind === 'meeting' && row.meeting && (
							<button type='button' onClick={() => {
								setSheet(row);
							}} className='w-full text-left bg-white border border-line border-l-[5px] rounded-2xl p-3.5' style={{borderLeftColor: '#1c1917'}}>
								<div className='flex items-center gap-3'>
									<Avatar id={row.meeting.personId} initials={row.meeting.initials} photoUrl={row.meeting.photoUrl} />
									<div className='flex-1 min-w-0'>
										<div className='font-bold text-[16px]'>{row.meeting.name}</div>
										<div className='text-[13px] text-muted'>{row.meeting.headline}</div>
									</div>
									<span className='text-stone-300 text-[19px] font-bold'>›</span>
								</div>
							</button>
						)}

						{row.kind === 'incoming' && row.meeting && (
							<div className='bg-tint-soft border-[1.5px] border-brand rounded-2xl p-3.5'>
								<div className='flex items-center gap-3'>
									<Avatar id={row.meeting.personId} initials={row.meeting.initials} photoUrl={row.meeting.photoUrl} />
									<div className='flex-1 min-w-0'>
										<div className='font-bold text-[16px]'>{row.meeting.name}</div>
										<div className='text-[13px] text-muted'>wants to meet you</div>
									</div>
									<span className='bg-brand text-white text-[11px] font-extrabold uppercase tracking-wide rounded-full px-2.5 py-1'>new</span>
								</div>
								{row.meeting.note && <p className='text-[12.5px] text-muted mt-2'>“{row.meeting.note}”</p>}
								<div className='flex gap-2 mt-3'>
									<button type='button' onClick={() => {
										void act(row.meeting!.id, 'accept');
									}} className='flex-1 bg-accept text-white rounded-[10px] py-2.5 text-sm font-bold'>Accept</button>
									<button type='button' onClick={() => {
										void act(row.meeting!.id, 'decline');
									}} className='flex-1 bg-stone-100 text-muted rounded-[10px] py-2.5 text-sm font-bold'>Decline</button>
								</div>
							</div>
						)}

						{row.kind === 'outgoing' && row.meeting && (
							<div className='border-[1.5px] border-dashed border-line rounded-2xl px-3.5 py-[10px] text-[13.5px] text-muted flex items-center justify-between gap-2'>
								<span className='flex items-center gap-2'>
									<Avatar id={row.meeting.personId} initials={row.meeting.initials} photoUrl={row.meeting.photoUrl} size='sm' />
									You asked {row.meeting.firstName} — waiting
								</span>
								<button type='button' onClick={() => {
									void act(row.meeting!.id, 'withdraw');
								}} className='text-brand font-bold text-[13px]'>withdraw</button>
							</div>
						)}
					</div>
				))}
			</div>

			{sheet?.meeting && (
				<div className='fixed inset-0 z-30'>
					<button type='button' aria-label='Close' className='absolute inset-0 bg-ink/45' onClick={() => {
						setSheet(null);
					}} />
					<div className='absolute bottom-0 inset-x-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] md:rounded-3xl bg-white rounded-t-3xl px-4 pt-3 pb-9 md:pb-5'>
						<div className='w-9 h-1 rounded-full bg-stone-300 mx-auto mb-4 md:hidden' />
						<div className='flex items-center gap-3'>
							<Avatar id={sheet.meeting.personId} initials={sheet.meeting.initials} photoUrl={sheet.meeting.photoUrl} size='lg' />
							<div>
								<div className='font-bold text-[19px]'>{sheet.meeting.name}</div>
								<div className='text-[13px] text-muted'>{sheet.meeting.headline}</div>
							</div>
						</div>
						<div className='h-px bg-line my-3' />
						<div className='text-[15px] font-bold'>{sheet.time} – {sheet.meeting.endTime} · meet at <a href={WATER_FOUNTAIN_URL} target='_blank' rel='noreferrer' className='text-brand underline'>the water fountain</a></div>
						{sheet.meeting.note && <p className='text-[12.5px] text-muted mt-1.5'>“{sheet.meeting.note}”</p>}
						<div className='flex gap-2 mt-4'>
							{sheet.meeting.waLink && (
								<a href={sheet.meeting.waLink} target='_blank' rel='noreferrer' className='flex-1 inline-flex items-center justify-center gap-1.5 bg-[#25d366] text-white rounded-[10px] py-[13px] text-sm font-bold'>
									<ChatIcon className='w-[15px] h-[15px]' />
									WhatsApp
								</a>
							)}
							<button
								type='button'
								onClick={() => {
									// eslint-disable-next-line no-alert
									if (window.confirm(`Cancel your ${sheet.time} meeting with ${sheet.meeting!.firstName}? They'll be notified and the slot reopens.`)) {
										void act(sheet.meeting!.id, 'cancel');
									}
								}}
								className='flex-1 bg-tint text-brand-dark rounded-[10px] py-[13px] text-sm font-bold'
							>
								Cancel meeting
							</button>
						</div>
					</div>
				</div>
			)}
		</Shell>
	);
};

export default SchedulePage;
