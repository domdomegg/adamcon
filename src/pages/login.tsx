import {useState} from 'react';
import {useRouter} from 'next/router';
import {api} from '../lib/client';
import {MailIcon} from '../components/Icons';

const REGISTRATION_URL = 'https://adamjones.me/blog/adamcon-2026/';

const inboxFor = (email: string): {label: string; href: string} | null => {
	const domain = email.split('@')[1]?.toLowerCase() ?? '';
	// The seeded dev cast is @example.com (a reserved domain, so no real
	// attendee can have it): their inbox is the local aws-ses-v2-local
	// viewer. hostname not localhost so it also works from a phone on the
	// same network.
	if (domain === 'example.com') {
		return {label: 'Open aws-ses-v2-local', href: `http://${window.location.hostname}:8005/`};
	}

	if (domain.includes('gmail') || domain.includes('googlemail')) {
		return {label: 'Open Gmail', href: 'https://mail.google.com/'};
	}

	if (['outlook', 'hotmail', 'live', 'msn'].some((d) => domain.includes(d))) {
		return {label: 'Open Outlook', href: 'https://outlook.live.com/mail/'};
	}

	if (domain.includes('yahoo')) {
		return {label: 'Open Yahoo Mail', href: 'https://mail.yahoo.com/'};
	}

	return null;
};

const Login = () => {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [sent, setSent] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState('');
	const inbox = inboxFor(email);

	const submit = async () => {
		if (sending) {
			return;
		}

		setError('');
		setSending(true);
		try {
			await api('/api/auth/request-link', {method: 'POST', body: JSON.stringify({email})});
			setSent(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		}

		setSending(false);
	};

	return (
		<div className='min-h-screen bg-[linear-gradient(180deg,#ffdfdc_0px,#fff3f1_300px,#fafaf9_560px)] px-4 pt-16 md:pt-28 text-center'>
			<h1 className='text-[42px] font-extrabold tracking-tight text-brand'>
				AdamCon <span className='text-ink'>’26</span>
			</h1>
			<p className='text-[15px] text-muted mt-1'>One-to-ones by the canal · Sat 1 Aug · King’s Cross</p>

			<div className='max-w-[420px] mx-auto bg-white border border-line rounded-2xl p-5 mt-9 text-left'>
				{!sent
					? (
						<>
							<label className='block text-[13px] font-bold mb-1.5' htmlFor='email'>Email</label>
							<input
								id='email'
								type='email'
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										void submit();
									}
								}}
								placeholder='the address you registered with'
								className='w-full border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] mb-3'
							/>
							{error && <p className='text-brand-dark text-[13px] mb-2'>{error}</p>}
							<button type='button' onClick={() => {
								void submit();
							}} className='w-full bg-brand text-white rounded-[14px] py-[15px] font-bold disabled:opacity-60' disabled={sending}>
								{sending ? 'Sending…' : 'Email me a sign-in link'}
							</button>
						</>
					)
					: (
						<>
							<div className='w-[52px] h-[52px] rounded-full bg-tint flex items-center justify-center mb-3'>
								<MailIcon className='w-6 h-6 text-brand-dark' />
							</div>
							<h2 className='text-xl font-extrabold mb-1'>Check your inbox</h2>
							<p className='text-[13.5px] text-muted mb-3'>We’ve sent a sign-in link to <b>{email}</b>.</p>
							{inbox && (
								<a href={inbox.href} className='block w-full bg-brand text-white rounded-[14px] py-[15px] font-bold text-center mb-2'>
									{inbox.label}
								</a>
							)}
							<button type='button' onClick={() => {
								void submit();
							}} className='w-full bg-stone-100 rounded-[14px] py-[15px] font-bold'>
								Resend
							</button>
							<button type='button' onClick={() => {
								setSent(false);
							}} className='block mx-auto mt-4 text-brand font-bold text-[13.5px]'>
								Use a different email ›
							</button>
						</>
					)}
			</div>

			{!sent && (
				<p className='text-[13px] text-muted mt-5'>
					Not registered? <a href={REGISTRATION_URL} className='text-brand font-bold'>Register here ›</a><br />
					New registrations can take a little while to be accepted.
				</p>
			)}
			{router.query.expired && !sent && (
				<p className='text-[13px] text-brand-dark mt-3'>That sign-in link has expired — request a fresh one above.</p>
			)}
		</div>
	);
};

export default Login;
