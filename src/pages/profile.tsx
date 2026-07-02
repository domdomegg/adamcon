import {useEffect, useRef, useState} from 'react';
import Shell from '../components/Shell';
import Avatar from '../components/Avatar';
import Loading from '../components/Loading';
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
					<textarea
						value={value}
						onChange={(e) => {
							onChange(e.target.value);
						}}
						className='mt-1.5 w-full h-[104px] bg-white border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] font-normal resize-none'
					/>
				)
				: (
					<input
						value={value}
						onChange={(e) => {
							onChange(e.target.value);
						}}
						className='mt-1.5 w-full bg-white border-[1.5px] border-line rounded-xl px-3 py-3 text-[15px] font-normal'
					/>
				)}
		</label>
		{note && <p className='text-[12px] text-muted -mt-0.5'>{note}</p>}
	</div>
);

/** Centre-crops to a square and downscales, so uploads stay small. */
const resizeToJpeg = async (file: File, size = 512): Promise<string> => {
	const bitmap = await createImageBitmap(file);
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(
		bitmap,
		(bitmap.width - side) / 2,
		(bitmap.height - side) / 2,
		side,
		side,
		0,
		0,
		size,
		size,
	);
	return canvas.toDataURL('image/jpeg', 0.85);
};

const Profile = () => {
	const [me, setMe] = useState<Me | null>(null);
	const [saved, setSaved] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [uploading, setUploading] = useState(false);
	const [photoError, setPhotoError] = useState('');
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		void api<Me>('/api/me').then(setMe);
	}, []);

	if (!me) {
		return <Shell><Loading /></Shell>;
	}

	const set = (patch: Partial<Me>) => {
		setSaved(false);
		setMe({...me, ...patch});
	};

	const save = async () => {
		setSaving(true);
		setSaveError('');
		try {
			await api('/api/me', {method: 'PUT', body: JSON.stringify(me)});
			setSaved(true);
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : 'Something went wrong');
		} finally {
			setSaving(false);
		}
	};

	const signOut = async () => {
		await api('/api/auth/signout', {method: 'POST'});
		// Drop the service worker's caches so the next user of this browser
		// can't see this account's cached schedule/profile while offline.
		if ('caches' in window) {
			const keys = await window.caches.keys();
			await Promise.all(keys.map(async (key) => window.caches.delete(key)));
		}

		window.location.assign('/login/');
	};

	const uploadPhoto = async (file: File) => {
		setPhotoError('');
		setUploading(true);
		try {
			const dataUrl = await resizeToJpeg(file);
			const {photoUrl} = await api<{photoUrl: string}>('/api/me/photo', {
				method: 'POST',
				body: JSON.stringify({dataUrl}),
			});
			setMe((current) => (current ? {...current, photoUrl} : current));
		} catch (e) {
			setPhotoError(e instanceof Error ? e.message : 'Upload failed');
		}

		setUploading(false);
	};

	return (
		<Shell>
			<div className='flex items-center justify-between mb-3.5'>
				<h1 className='text-xl font-extrabold text-brand-dark'>Your profile</h1>
				<button
					type='button'
					onClick={() => {
						void signOut();
					}}
					className='bg-stone-100 rounded-[10px] px-4 py-2 text-sm font-bold'
				>
					Sign out
				</button>
			</div>

			<div className='bg-white border border-line rounded-2xl p-3.5 mb-3.5 flex items-center gap-4'>
				<Avatar id={me.id} initials={me.initials} photoUrl={me.photoUrl} size='lg' />
				<div>
					<input
						ref={fileRef}
						type='file'
						accept='image/*'
						className='hidden'
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								void uploadPhoto(file);
							}

							e.target.value = '';
						}}
					/>
					<button
						type='button'
						onClick={() => fileRef.current?.click()}
						disabled={uploading}
						className='bg-stone-100 rounded-[10px] px-4 py-2 text-sm font-bold disabled:opacity-60'
					>
						{uploading ? 'Uploading…' : 'Change photo'}
					</button>
					<p className='text-[12px] text-muted mt-1.5'>Signed in as {me.email}</p>
					{photoError && <p className='text-[12px] text-brand-dark mt-1'>{photoError}</p>}
				</div>
			</div>

			<Field
				label='Name'
				value={me.name}
				onChange={(name) => {
					set({name});
				}}
			/>
			<Field
				label='Headline'
				value={me.headline}
				onChange={(headline) => {
					set({headline});
				}}
				note='Why would someone book 25 minutes with you?'
			/>
			<Field
				label='Bio'
				value={me.bio}
				onChange={(bio) => {
					set({bio});
				}}
				textarea
			/>
			<Field
				label='Link'
				value={me.linkUrl}
				onChange={(linkUrl) => {
					set({linkUrl});
				}}
			/>
			<Field
				label='WhatsApp number'
				value={me.whatsapp}
				onChange={(whatsapp) => {
					set({whatsapp});
				}}
			/>

			{saveError && <p className='text-brand-dark text-[13px] mb-2'>{saveError}</p>}
			<button
				type='button'
				disabled={saving}
				onClick={() => {
					void save();
				}}
				className='w-full bg-brand text-white rounded-[14px] py-[15px] font-bold disabled:opacity-60'
			>
				{saving ? 'Saving…' : (saved ? 'Saved ✓' : 'Save')}
			</button>
		</Shell>
	);
};

export default Profile;
