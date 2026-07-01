import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
	distDir: 'dist',
	reactStrictMode: true,
	devIndicators: false,
	images: {
		unoptimized: true,
	},
	trailingSlash: true,
};

export default nextConfig;
