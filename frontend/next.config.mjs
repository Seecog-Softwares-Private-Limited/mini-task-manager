import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'properties.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    if (backend.startsWith('http')) {
      return [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }];
    }
    return [];
  },
};

export default nextConfig;
