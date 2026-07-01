import {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import Shell from '../components/Shell';
import Avatar from '../components/Avatar';
import {api} from '../lib/client';

type Me = {
	id: number;
	email: string;
	name: string;
	headline: string;
	bio: string;
	linkUrl: string;
	whatsapp: string;
	photoUrl: string;
	initials: string;
};

const Field = ({
	label, value, onChange, note, textarea,
}: {label: string; value: string; onChange: (v: string) => void; note?: string; textarea?: boolean}) => (
	<div className='mb-3.5'>
		<label className='block text-[13px] font-bold mb-1.5'>
			{label}
			{textarea
				? (
					<textarea value={value} onChange={(e) => {
						onChange(e.target.value);
					}} className='mt-1.5 w-full h-[104px] bg-white border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] font-normal resize-none' />
				)
				: (
					<input value={value} onChange={(e) => {
						onChange(e.target.value);
					}} className='mt-1.5 w-full bg-white border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] font-normal' />
				)}
		</label>
		{note && <p className='text-[12px] text-muted -mt-0.5'>{note}</p>}
	</div>
);

const Profile = () => {
	const router = useRouter();
	const [me, setMe] = useState<Me | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		void api<Me>('/api/me').then(setMe);
	}, []);

	if (!me) {
		return <Shell><div /></Shell>;
	}

	const set = (patch: Partial<Me>) => {
		setSaved(false);
		setMe({...me, ...patch});
	};

	const save = async () => {
		await api('/api/me', {method: 'PUT', body: JSON.stringify(me)});
		setSaved(true);
	};

	const signOut = async () => {
		await api('/api/auth/signout', {method: 'POST'});
		await router.push('/login/');
	};

	return (
		<Shell>
			<div className='flex items-center justify-between mb-3.5'>
				<h1 className='text-xl font-extrabold text-brand-dark'>Your profile</h1>
				<button type='button' onClick={() => {
					void signOut();
				}} className='bg-stone-100 rounded-[10px] px-4 py-2 text-sm font-bold'>
					Sign out
				</button>
			</div>

			<div className='bg-white border border-line rounded-2xl p-3.5 mb-3.5 flex items-center gap-3'>
				<Avatar id={me.id} initials={me.initials} photoUrl={me.photoUrl} size='lg' />
				<div className='text-[12.5px] text-muted'>
					Signed in as {me.email}. Find yourself in People to preview your page.
				</div>
			</div>

			<Field label='Name' value={me.name} onChange={(name) => {
				set({name});
			}} />
			<Field label='Headline' value={me.headline} onChange={(headline) => {
				set({headline});
			}} note='Why would someone book 25 minutes with you?' />
			<Field label='Bio' value={me.bio} onChange={(bio) => {
				set({bio});
			}} textarea />
			<Field label='Link' value={me.linkUrl} onChange={(linkUrl) => {
				set({linkUrl});
			}} />
			<Field label='Photo URL' value={me.photoUrl} onChange={(photoUrl) => {
				set({photoUrl});
			}} />
			<Field
				label='WhatsApp number'
				value={me.whatsapp}
				onChange={(whatsapp) => {
					set({whatsapp});
				}}
				note='Never shown — powers the “WhatsApp” button so people can message you. Clear it to opt out.'
			/>

			<button type='button' onClick={() => {
				void save();
			}} className='w-full bg-brand text-white rounded-[14px] py-[15px] font-bold'>
				{saved ? 'Saved ✓' : 'Save'}
			</button>
		</Shell>
	);
};

export default Profile;
