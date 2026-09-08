import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Electron packages the generated static renderer. All workspace data is
  // kept in localStorage, so there is no server runtime in the desktop app.
  output: 'export',
};

export default nextConfig;
