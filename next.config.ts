import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	distDir: 'dist',
	reactStrictMode: true,
	devIndicators: false,
	images: {
		unoptimized: true,
	},
	trailingSlash: true,
	async redirects() {
		// Sign-in emails briefly linked to a /verify/ confirm page; keep those
		// links working (the query string is preserved automatically).
		return [{source: '/verify', destination: '/api/auth/verify/', permanent: false}];
	},
};

export default nextConfig;
