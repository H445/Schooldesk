import { build } from 'vite';

// Emit relative assets for Electron without a prerender server.
// Build errors reject normally and keep packaging from using stale output.
await build();
