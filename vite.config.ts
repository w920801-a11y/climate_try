
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 確保 process.env.API_KEY 在瀏覽器環境中可用
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    // 解決提示中提到的 chunk size 限制警告
    chunkSizeWarningLimit: 1000,
  },
});
