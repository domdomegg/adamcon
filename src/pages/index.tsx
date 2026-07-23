import {useEffect} from 'react';

const Home = () => {
	useEffect(() => {
		// Keep the query string: invite links use /?email=... to prefill login.
		fetch('/api/me/').then((res) => {
			window.location.replace(res.ok ? '/people/' : `/login/${window.location.search}`);
		}).catch(() => {
			window.location.replace(`/login/${window.location.search}`);
		});
	}, []);
	return null;
};

export default Home;
