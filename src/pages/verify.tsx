import {useState} from 'react';
import {useRouter} from 'next/router';

/**
 * Landing page for emailed sign-in links. The token is only consumed on the
 * button's POST, so email link-scanners that prefetch the GET can't burn it.
 */
const Verify = () => {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [expired, setExpired] = useState(false);

	const signIn = async () => {
		setPending(true);
		try {
			const res = await fetch('/api/auth/verify/', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({token: String(router.query.token ?? '')}),
			});
			if (!res.ok) {
				throw new Error('expired');
			}

			window.location.assign('/people/');
		} catch {
			setExpired(true);
			setPending(false);
		}
	};

	return (
		<div className='min-h-screen bg-[linear-gradient(180deg,#ffdfdc_0px,#fff3f1_300px,#fafaf9_560px)] px-4 pt-16 md:pt-28 text-center'>
			<h1 className='text-[42px] font-extrabold tracking-tight text-brand'>
				AdamCon <span className='text-ink'>’26</span>
			</h1>
			<p className='text-[15px] text-muted mt-1'>One-to-ones by the canal · Sat 1 Aug · King’s Cross</p>

			<div className='max-w-[420px] mx-auto bg-white border border-line rounded-2xl p-5 mt-9'>
				{!expired
					? (
						<>
							<p className='text-[13.5px] text-muted mb-3'>You’re one tap away.</p>
							<button
								type='button'
								onClick={() => {
									void signIn();
								}}
								disabled={pending || !router.isReady}
								className='w-full bg-brand text-white rounded-[14px] py-[15px] font-bold disabled:opacity-60'
							>
								{pending ? 'Signing in…' : 'Sign in to AdamCon'}
							</button>
						</>
					)
					: (
						<p className='text-[13.5px] text-muted'>
							That sign-in link has expired or was already used.{' '}
							<a href='/login/' className='text-brand font-bold'>Request a fresh one ›</a>
						</p>
					)}
			</div>
		</div>
	);
};

export default Verify;
