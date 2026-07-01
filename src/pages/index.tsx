import {useEffect} from 'react';
import {useRouter} from 'next/router';

const Home = () => {
	const router = useRouter();
	useEffect(() => {
		fetch('/api/me').then((res) => {
			void router.replace(res.ok ? '/people/' : '/login/');
		}).catch(async () => router.replace('/login/'));
	}, [router]);
	return null;
};

export default Home;
