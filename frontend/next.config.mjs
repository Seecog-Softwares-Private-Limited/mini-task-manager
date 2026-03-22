import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root properties.env first so PORT is available (backend port)
dotenv.config({ path: path.join(__dirname, '..', 'properties.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    // Empty = browser calls same-origin `/api/v1`, handled by `app/api/v1/[...path]/route.ts`
    // (server-side proxy to Nest — more reliable than next.config rewrites for POST/login).
    NEXT_PUBLIC_API_URL: '',
  },
  // API proxy: see frontend/src/app/api/v1/[...path]/route.ts
};

export default nextConfig;
