import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 5173,
    strictPort: false, // 端口被占用时自动尝试下一个端口
    proxy: {
      '/api': {
        target: 'http://100.64.0.131:3000',
        changeOrigin: true,
      },
    },
  },
});
