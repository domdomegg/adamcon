import {useEffect} from 'react';

/** Full-screen photo view, WhatsApp-style: tap anywhere or Escape to close. */
const PhotoLightbox = ({photoUrl, name, onClose}: {photoUrl: string; name: string; onClose: () => void}) => {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		window.addEventListener('keydown', onKey);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose]);

	return (
		<div
			role='dialog'
			aria-modal='true'
			aria-label={`Photo of ${name}`}
			className='fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4'
			onClick={onClose}
		>
			<button
				type='button'
				aria-label='Close photo'
				className='absolute top-3 right-3 w-11 h-11 text-white/85 text-[28px] leading-none'
				onClick={onClose}
			>
				×
			</button>
			<img src={photoUrl} alt={`Photo of ${name}`} className='w-full max-w-[512px] max-h-full rounded-xl object-contain' />
		</div>
	);
};

export default PhotoLightbox;
