import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(
      (process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || 'local').slice(0, 7),
    ),
  },
});
