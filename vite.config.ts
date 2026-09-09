import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// This project is packaged as a local Electron renderer. Keep the generated
// page static so the desktop app has no server runtime or network dependency.
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  build: { outDir: 'dist/client', target: 'es2022', modulePreload: false },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
});
