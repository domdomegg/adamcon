import '../styles/globals.css';
import type {AppProps} from 'next/app';
import Head from 'next/head';
import {useEffect} from 'react';

const App = ({Component, pageProps}: AppProps) => {
	useEffect(() => {
		if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
			void navigator.serviceWorker.register('/sw.js');
		}
	}, []);

	return (
		<>
			<Head>
				<title>AdamCon ’26</title>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<meta name='theme-color' content='#e7000b' />
				<link rel='manifest' href='/manifest.json' />
			</Head>
			<Component {...pageProps} />
		</>
	);
};

export default App;
