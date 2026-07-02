import {useEffect} from 'react';

const Home = () => {
	useEffect(() => {
		fetch('/api/me/').then((res) => {
			window.location.replace(res.ok ? '/people/' : '/login/');
		}).catch(() => {
			window.location.replace('/login/');
		});
	}, []);
	return null;
};

export default Home;
