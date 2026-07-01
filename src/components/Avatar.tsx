import {avatarColor} from '../lib/client';

const SIZES = {
	sm: 'w-9 h-9 text-[13px]',
	md: 'w-12 h-12 text-[17px]',
	lg: 'w-[72px] h-[72px] text-[26px]',
};

const Avatar = ({
	id, initials, photoUrl, size = 'md',
}: {id: number; initials: string; photoUrl?: string; size?: keyof typeof SIZES}) => {
	if (photoUrl) {
		return <img src={photoUrl} alt='' className={`${SIZES[size]} rounded-full object-cover shrink-0`} />;
	}

	return (
		<div
			className={`${SIZES[size]} rounded-full shrink-0 flex items-center justify-center text-white font-bold`}
			style={{background: avatarColor(id)}}
		>
			{initials}
		</div>
	);
};

export default Avatar;
