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
};

export default nextConfig;
