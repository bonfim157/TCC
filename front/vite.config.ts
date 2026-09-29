import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Modo real: /api vai para o servidor local (npm run dev:servidor, porta 3000).
      proxy: env.VITE_API === 'real' ? { '/api': 'http://localhost:3000' } : undefined,
    },
  };
});
