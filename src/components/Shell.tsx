import {useRouter} from 'next/router';
import {useEffect, useState, type ReactNode} from 'react';
import {CalendarIcon, PeopleIcon, UserIcon} from './Icons';

const TABS = [
	{href: '/people', label: 'People', Icon: PeopleIcon},
	{href: '/schedule', label: 'Schedule', Icon: CalendarIcon},
	{href: '/profile', label: 'Profile', Icon: UserIcon},
];

const Badge = ({count}: {count: number}) => (count > 0
	? (
		<span className='absolute -top-2 right-2 md:static md:ml-1 min-w-[18px] h-[18px] rounded-full bg-brand text-white text-[11px] font-extrabold inline-flex items-center justify-center px-1 border-2 border-white md:border-0'>
			{count}
		</span>
	)
	: null);

/**
 * App chrome: bottom tab bar on mobile, top nav on desktop (design D2), with
 * the red wash running the full window width.
 */
const Shell = ({children, badgeOverride}: {children: ReactNode; badgeOverride?: number}) => {
	const router = useRouter();
	const [badge, setBadge] = useState(0);
	const [offline, setOffline] = useState(false);

	useEffect(() => {
		setOffline(!navigator.onLine);
		const on = () => {
			setOffline(false);
		};

		const off = () => {
			setOffline(true);
		};

		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	}, []);

	useEffect(() => {
		if (badgeOverride !== undefined) {
			return undefined;
		}

		let cancelled = false;
		const load = () => {
			fetch('/api/schedule/')
				.then(async (res) => (res.ok ? res.json() : null))
				.then((data: {toAnswer: number} | null) => {
					if (data && !cancelled) {
						setBadge(data.toAnswer);
					}
				})
				.catch(() => undefined);
		};

		load();
		const interval = setInterval(load, 60_000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [badgeOverride]);

	const count = badgeOverride ?? badge;

	const tabs = TABS.map(({href, label, Icon}) => {
		const active = router.pathname.startsWith(href);
		return {
			href, label, Icon, active,
		};
	});

	return (
		<div className='min-h-screen bg-[linear-gradient(180deg,#ffdfdc_0px,#fff3f1_300px,#fafaf9_560px)]'>
			{/* Desktop top nav */}
			<header className='hidden md:block fixed top-0 inset-x-0 bg-white border-b border-line z-20'>
				<div className='max-w-[1000px] mx-auto flex items-center justify-between px-6 py-3'>
					<a href='/people/' className='text-[21px] font-extrabold tracking-tight text-brand'>
						AdamCon <span className='text-ink'>’26</span>
					</a>
					<nav className='flex gap-2'>
						{tabs.map(({href, label, Icon, active}) => (
							<a
								key={href}
								href={`${href}/`}
								className={`flex items-center gap-2 px-4 py-2 rounded-full text-[15px] font-bold ${active ? 'bg-tint text-brand-dark' : 'text-muted'}`}
							>
								<Icon className='w-[19px] h-[19px]' />
								{label}
								{label === 'Schedule' && <Badge count={count} />}
							</a>
						))}
					</nav>
				</div>
			</header>

			<main className='max-w-[520px] mx-auto px-4 pt-5 pb-28 md:pt-24 md:pb-16'>
				{offline && (
					<div className='bg-stone-800 text-white text-[13px] font-semibold rounded-xl px-3.5 py-2.5 mb-3.5 text-center'>
						You’re offline — this might not be up to date.
					</div>
				)}
				{children}
			</main>

			{/* Mobile bottom tab bar */}
			<nav className='md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-line z-20 flex px-5 pt-2 pb-6'>
				{tabs.map(({href, label, Icon, active}) => (
					<a key={href} href={`${href}/`} className={`flex-1 flex flex-col items-center gap-[3px] text-[11.5px] font-semibold ${active ? 'text-brand-dark font-extrabold' : 'text-stone-400'}`}>
						<span className={`relative flex px-5 py-1 rounded-full ${active ? 'bg-tint' : ''}`}>
							<Icon className='w-6 h-6' />
							{label === 'Schedule' && <Badge count={count} />}
						</span>
						{label}
					</a>
				))}
			</nav>
		</div>
	);
};

export default Shell;
