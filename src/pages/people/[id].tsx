import {useRouter} from 'next/router';
import {
	useCallback, useEffect, useRef, useState,
} from 'react';
import Shell from '../../components/Shell';
import Avatar from '../../components/Avatar';
import Loading from '../../components/Loading';
import {ChatIcon, LinkIcon} from '../../components/Icons';
import {api} from '../../lib/client';
import type {BookRow} from '../api/people/[id]';
import type {PublicUser} from '../../lib/shape';

type Detail = {
	person: PublicUser;
	isMe: boolean;
	rows: BookRow[];
	existing: {
		id: number;
		status: 'pending' | 'accepted';
		time?: string;
		note: string;
		direction: 'in' | 'out';
	} | null;
};

const prettyLink = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

const Book = () => {
	const router = useRouter();
	const [detail, setDetail] = useState<Detail | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const [note, setNote] = useState('');
	const [error, setError] = useState('');
	const [pending, setPending] = useState<string | null>(null);
	const noteRef = useRef<HTMLTextAreaElement>(null);
	const preselected = useRef(false);

	const load = useCallback(async () => {
		if (!router.isReady) {
			return null;
		}

		const data = await api<Detail>(`/api/people/${String(router.query.id)}`);
		setDetail(data);
		return data;
	}, [router.isReady, router.query.id]);

	const selectSlot = (slotId: number | null) => {
		setSelected(slotId);
		if (slotId !== null) {
			// Glide the note to the TOP of the screen (offset by scroll-mt on
			// the textarea), then focus. Centering put it behind the keyboard
			// that the focus opens — iOS overlays the bottom half of the screen
			// without resizing the viewport.
			setTimeout(() => {
				noteRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
				setTimeout(() => noteRef.current?.focus({preventScroll: true}), 350);
			}, 50);
		}
	};

	useEffect(() => {
		load().then((data) => {
			// Your own card links straight to the edit page; handle direct URLs too.
			if (data?.isMe) {
				window.location.replace('/profile/');
				return;
			}

			// Arriving via "find someone" for a specific slot: pre-select it.
			const wanted = Number(router.query.slot);
			if (data && wanted && !preselected.current) {
				preselected.current = true;
				if (data.rows.some((r) => r.slotId === wanted && r.state === 'free')) {
					selectSlot(wanted);
				}
			}
		}).catch(() => {
			window.location.assign('/people/');
		});
	}, [load, router.query.slot]);

	if (!detail || detail.isMe) {
		return <Shell><Loading /></Shell>;
	}

	const {person, rows, existing} = detail;
	const firstName = person.name.split(' ')[0];
	const fromSchedule = router.query.from === 'schedule';

	const request = async () => {
		if (!selected) {
			return;
		}

		setPending('request');
		setError('');
		try {
			await api('/api/meetings', {
				method: 'POST',
				body: JSON.stringify({targetId: person.id, slotId: selected, note}),
			});
			window.location.assign('/schedule/');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
			setPending(null);
			// Reload — the request may have landed even if the response didn't.
			await load().catch(() => undefined);
		}
	};

	const act = async (action: 'accept' | 'decline' | 'withdraw' | 'cancel') => {
		if (!existing) {
			return;
		}

		setPending(action);
		setError('');
		try {
			await api(`/api/meetings/${existing.id}`, {method: 'POST', body: JSON.stringify({action})});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		} finally {
			await load().catch(() => undefined);
			setPending(null);
			setSelected(null);
		}
	};

	return (
		<Shell>
			<a href={fromSchedule ? '/schedule/' : '/people/'} className='flex items-center gap-2.5 text-lg font-extrabold mb-3'>
				<span className='text-2xl text-muted leading-none'>‹</span> {fromSchedule ? 'Schedule' : 'People'}
			</a>

			<div className='bg-white border border-line rounded-2xl p-3.5 mb-3'>
				<div className='flex items-center gap-3'>
					<Avatar id={person.id} initials={person.initials} photoUrl={person.photoUrl} size='lg' />
					<div className='flex-1 min-w-0'>
						<div className='font-bold text-[19px]'>{person.name}</div>
						<div className='text-[13px] text-muted'>{person.headline}</div>
					</div>
				</div>
				{person.bio && (
					<>
						<div className='h-px bg-line my-3' />
						<p className='text-[12.5px] whitespace-pre-line'>{person.bio}</p>
					</>
				)}
				<div className='flex items-center justify-between mt-2.5'>
					{person.linkUrl
						? (
							<a href={person.linkUrl} className='flex items-center gap-1.5 text-sm font-semibold text-brand' target='_blank' rel='noreferrer'>
								<LinkIcon className='w-[15px] h-[15px]' />
								{prettyLink(person.linkUrl)}
							</a>
						)
						: <span />}
					{person.waLink && (
						<a href={person.waLink} className='inline-flex items-center gap-1.5 bg-[#25d366] text-white rounded-[10px] px-3.5 py-2 text-[13.5px] font-bold' target='_blank' rel='noreferrer'>
							<ChatIcon className='w-[15px] h-[15px]' />
							WhatsApp
						</a>
					)}
				</div>
			</div>

			{error && <p className='text-brand-dark text-[13px] mb-3'>{error}</p>}

			{existing?.status === 'accepted' && (
				<div className='bg-white border border-line rounded-2xl p-4'>
					<div className='text-[15px] font-bold'>You’re meeting {firstName} at {existing.time}</div>
					{existing.note && <p className='text-[12.5px] text-muted mt-1.5'>“{existing.note}”</p>}
					<button
						type='button'
						disabled={pending !== null}
						onClick={() => {
							// eslint-disable-next-line no-alert
							if (window.confirm(`Cancel your ${existing.time} meeting with ${firstName}? They'll be notified and the slot reopens.`)) {
								void act('cancel');
							}
						}}
						className='w-full mt-3 bg-tint text-brand-dark rounded-[10px] py-[11px] text-sm font-bold disabled:opacity-60'
					>
						{pending === 'cancel' ? 'Cancelling…' : 'Cancel meeting'}
					</button>
				</div>
			)}

			{existing?.status === 'pending' && existing.direction === 'out' && (
				<div className='bg-white border border-line rounded-2xl p-4'>
					<div className='text-[15px] font-bold'>You asked {firstName} for {existing.time} — waiting</div>
					{existing.note && <p className='text-[12.5px] text-muted mt-1.5'>“{existing.note}”</p>}
					<button
						type='button'
						disabled={pending !== null}
						onClick={() => {
							void act('withdraw');
						}}
						className='w-full mt-3 bg-stone-100 rounded-[10px] py-[11px] text-sm font-bold disabled:opacity-60'
					>
						{pending === 'withdraw' ? 'Withdrawing…' : 'Withdraw request'}
					</button>
				</div>
			)}

			{existing?.status === 'pending' && existing.direction === 'in' && (
				<div className='bg-tint-soft border-[1.5px] border-brand rounded-2xl p-4'>
					<div className='text-[15px] font-bold'>{firstName} wants to meet you at {existing.time}</div>
					{existing.note && <p className='text-[12.5px] text-muted mt-1.5'>“{existing.note}”</p>}
					<div className='flex gap-2 mt-3'>
						<button
							type='button'
							disabled={pending !== null}
							onClick={() => {
								void act('accept');
							}}
							className='flex-1 bg-accept text-white rounded-[10px] py-2.5 text-sm font-bold disabled:opacity-60'
						>
							{pending === 'accept' ? 'Accepting…' : 'Accept'}
						</button>
						<button
							type='button'
							disabled={pending !== null}
							onClick={() => {
								void act('decline');
							}}
							className='flex-1 bg-stone-100 text-muted rounded-[10px] py-2.5 text-sm font-bold disabled:opacity-60'
						>
							{pending === 'decline' ? 'Declining…' : 'Decline'}
						</button>
					</div>
				</div>
			)}

			{!existing && (
				<>
					<h2 className='text-xl font-extrabold text-brand-dark mt-5'>Pick a time</h2>
					<p className='text-[13px] text-muted mb-3.5'>Times you’re <b>both</b> free · meetings are 25 min</p>

					<div className='bg-white border border-line rounded-2xl overflow-hidden'>
						{rows.map((row) => {
							const free = row.state === 'free';
							const isSelected = row.slotId !== null && selected === row.slotId;
							return (
								<button
									key={row.time}
									type='button'
									disabled={!free}
									onClick={() => {
										selectSlot(row.slotId);
									}}
									className={`w-full flex items-center justify-between px-4 py-[11px] border-b border-line last:border-b-0 text-[15px] text-left ${isSelected ? 'bg-brand text-white' : ''}`}
								>
									<span className={`font-bold ${free || isSelected ? '' : 'text-stone-300'}`}>{row.time}</span>
									<span className={`text-[12.5px] font-semibold ${isSelected ? 'text-red-200' : 'text-stone-300'}`}>
										{isSelected ? '✓ selected' : row.label}
									</span>
								</button>
							);
						})}
					</div>

					<label className='block text-[13px] font-bold mt-4 mb-1.5' htmlFor='note'>Add a note (optional)</label>
					<textarea
						id='note'
						ref={noteRef}
						value={note}
						onChange={(e) => {
							setNote(e.target.value);
						}}
						className='scroll-mt-24 w-full h-[74px] bg-white border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] resize-none'
					/>

					{/* Sticky so the button stays visible above the keyboard while writing the note */}
					<div className='sticky bottom-3 mt-3 md:static'>
						<button
							type='button'
							disabled={!selected || pending !== null}
							onClick={() => {
								void request();
							}}
							className='w-full bg-brand text-white rounded-[14px] py-[15px] font-bold shadow-lg shadow-red-200/60 disabled:opacity-40 disabled:shadow-none'
						>
							{pending === 'request' ? 'Sending…' : (selected ? `Request ${rows.find((r) => r.slotId === selected)?.time} with ${firstName}` : 'Pick a time above')}
						</button>
					</div>
					<p className='text-[12.5px] text-muted text-center mt-2.5'>
						The slot is held for you both until {firstName} answers.
					</p>
				</>
			)}
		</Shell>
	);
};

export default Book;
