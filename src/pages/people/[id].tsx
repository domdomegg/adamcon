import Link from 'next/link';
import {useRouter} from 'next/router';
import {
	useCallback, useEffect, useRef, useState,
} from 'react';
import Shell from '../../components/Shell';
import Avatar from '../../components/Avatar';
import {ChatIcon, LinkIcon} from '../../components/Icons';
import {api} from '../../lib/client';
import type {BookRow} from '../api/people/[id]';
import type {PublicUser} from '../../lib/shape';

type Detail = {
	person: PublicUser;
	isMe: boolean;
	rows: BookRow[];
	existing: {status: string; time?: string} | null;
};

const prettyLink = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

const Book = () => {
	const router = useRouter();
	const [detail, setDetail] = useState<Detail | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const [note, setNote] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const noteRef = useRef<HTMLTextAreaElement>(null);
	const preselected = useRef(false);

	const selectSlot = (slotId: number | null) => {
		setSelected(slotId);
		if (slotId !== null) {
			// Glide down to the note and focus it once the scroll has settled,
			// so mobile keyboards don't cause a jarring double-jump.
			setTimeout(() => {
				noteRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
				setTimeout(() => noteRef.current?.focus({preventScroll: true}), 350);
			}, 50);
		}
	};

	const load = useCallback(async () => {
		if (!router.isReady) {
			return null;
		}

		const data = await api<Detail>(`/api/people/${String(router.query.id)}`);
		setDetail(data);
		return data;
	}, [router.isReady, router.query.id]);

	useEffect(() => {
		load().then((data) => {
			// Your own card links straight to the edit page; handle direct URLs too.
			if (data?.isMe) {
				void router.replace('/profile/');
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
		}).catch(async () => router.push('/people/'));
	}, [load, router]);

	if (!detail || detail.isMe) {
		return <Shell><div /></Shell>;
	}

	const {person, rows, existing} = detail;
	const firstName = person.name.split(' ')[0];

	const request = async () => {
		if (!selected) {
			return;
		}

		setSubmitting(true);
		setError('');
		try {
			await api('/api/meetings', {
				method: 'POST',
				body: JSON.stringify({targetId: person.id, slotId: selected, note}),
			});
			await router.push('/schedule/');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
			setSubmitting(false);
			await load();
		}
	};

	return (
		<Shell>
			<Link href='/people/' className='flex items-center gap-2.5 text-lg font-extrabold mb-3'>
				<span className='text-2xl text-muted leading-none'>‹</span> People
			</Link>

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

			{existing && (
				<div className='bg-white border border-line rounded-2xl p-4 text-[14px]'>
					{existing.status === 'accepted'
						? <>You’re meeting {firstName} at <b>{existing.time}</b> — it’s on your <Link href='/schedule/' className='text-brand font-bold'>schedule</Link>.</>
						: <>You have a pending request with {firstName} for <b>{existing.time}</b> — manage it from your <Link href='/schedule/' className='text-brand font-bold'>schedule</Link>.</>}
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
						className='w-full h-[74px] bg-white border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] resize-none'
					/>

					{error && <p className='text-brand-dark text-[13px] mt-2'>{error}</p>}
					{/* Sticky so the button stays visible above the keyboard while writing the note */}
					<div className='sticky bottom-3 mt-3 md:static'>
						<button
							type='button'
							disabled={!selected || submitting}
							onClick={() => {
								void request();
							}}
							className='w-full bg-brand text-white rounded-[14px] py-[15px] font-bold shadow-lg shadow-red-200/60 disabled:opacity-40 disabled:shadow-none'
						>
							{selected ? `Request ${rows.find((r) => r.slotId === selected)?.time} with ${firstName}` : 'Pick a time above'}
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
