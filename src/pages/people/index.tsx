import {useRouter} from 'next/router';
import {useEffect, useMemo, useState} from 'react';
import Shell from '../../components/Shell';
import Avatar from '../../components/Avatar';
import Loading from '../../components/Loading';
import {CheckIcon, ClockIcon, SearchIcon} from '../../components/Icons';
import {api} from '../../lib/client';
import type {PersonCard} from '../api/people';

const StatusPill = ({person}: {person: PersonCard}) => {
	if (person.status === 'booked') {
		return (
			<span className='inline-flex items-center gap-1.5 rounded-full bg-booked text-booked-ink px-3 py-1.5 text-[13.5px] font-bold shrink-0'>
				<CheckIcon className='w-3.5 h-3.5' />
				{person.time}
			</span>
		);
	}

	return (
		<span className='inline-flex items-center gap-1.5 rounded-full bg-stone-100 text-muted px-3 py-1.5 text-[13.5px] font-bold shrink-0'>
			<ClockIcon className='w-3.5 h-3.5' />
			{person.time}
		</span>
	);
};

const People = () => {
	const router = useRouter();
	const freeAt = typeof router.query.freeAt === 'string' ? router.query.freeAt : null;
	const [people, setPeople] = useState<PersonCard[] | null>(null);
	const [freeAtTime, setFreeAtTime] = useState<string | null>(null);
	const [query, setQuery] = useState('');

	useEffect(() => {
		if (!router.isReady) {
			return;
		}

		void api<{people: PersonCard[]; freeAt: string | null}>(`/api/people${freeAt ? `?freeAt=${freeAt}` : ''}`)
			.then((data) => {
				setPeople(data.people);
				setFreeAtTime(data.freeAt);
			});
	}, [router.isReady, freeAt]);

	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return people ?? [];
		}

		return (people ?? []).filter((p) => `${p.name} ${p.headline} ${p.bio}`.toLowerCase().includes(q));
	}, [people, query]);

	const personHref = (person: PersonCard) =>
		(person.isMe ? '/profile/' : `/people/${person.id}/${freeAt && person.status === 'none' ? `?slot=${freeAt}` : ''}`);

	return (
		<Shell>
			<h1 className='text-xl font-extrabold text-brand-dark'>People</h1>
			<p className='text-[13px] text-muted mb-3.5'>
				{people ? `${people.length} attending · ` : ''}Sat 1 Aug, 11:00–18:00
			</p>

			<div className='flex items-center gap-2 bg-white border-[1.5px] border-line rounded-xl px-3.5 py-[11px] mb-3.5'>
				<SearchIcon className='w-[17px] h-[17px] text-muted shrink-0' />
				<input
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
					}}
					placeholder='Search names and bios…'
					className='w-full text-[15px] outline-none bg-transparent'
				/>
			</div>

			{freeAtTime && (
				<a
					href='/people/'
					className='inline-flex items-center gap-2 mb-3 bg-white border-[1.5px] border-brand text-brand-dark rounded-full px-3.5 py-1.5 text-[13.5px] font-bold'
				>
					Free at {freeAtTime} <span className='opacity-70 font-extrabold'>✕</span>
				</a>
			)}

			{!people && <Loading />}

			{shown.map((person) => (
				<div key={person.id} className='relative bg-white border border-line rounded-2xl p-3.5 mb-3'>
					<div className='flex items-center gap-3'>
						<Avatar id={person.id} initials={person.initials} photoUrl={person.photoUrl} />
						<div className='flex-1 min-w-0'>
							<div className='font-bold text-[16px]'>
								{/* Stretched link: the whole card navigates to the person */}
								<a href={personHref(person)} className='after:absolute after:inset-0 after:rounded-2xl'>
									{person.name}
								</a>
								{person.isMe && <span className='text-muted text-[12.5px] font-semibold'> · you</span>}
							</div>
							<div className='text-[13px] text-muted'>{person.headline}</div>
						</div>
						{person.isMe || person.status === 'none'
							? (
								<a
									href={personHref(person)}
									tabIndex={-1}
									className={`relative rounded-[10px] px-4 py-2 text-sm font-bold shrink-0 ${person.isMe ? 'bg-stone-100 text-ink' : 'bg-brand text-white'}`}
								>
									{person.isMe ? 'View' : 'Book'}
								</a>
							)
							: <StatusPill person={person} />}
					</div>
					{person.note && (
						<p className='text-[12.5px] text-muted mt-2'>“{person.note}”</p>
					)}
				</div>
			))}
		</Shell>
	);
};

export default People;
