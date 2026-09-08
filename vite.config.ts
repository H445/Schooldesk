import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// This project is packaged as a local Electron renderer. Keep the build free
// of the former Cloudflare worker and Sites adapters so the generated page has
// no server runtime or network dependency.
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext()],
});
