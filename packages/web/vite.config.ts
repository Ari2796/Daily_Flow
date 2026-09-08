import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  plugins: [
    react(),
    // ESLint runs on every build. Errors (including max-lines) fail the build.
    // This means TaskBoard.tsx at 280+ lines will cause `npm run build` to fail
    // until you refactor it in Phase 6 using the Kiro Refactor Power.
    eslint({ failOnError: true }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
