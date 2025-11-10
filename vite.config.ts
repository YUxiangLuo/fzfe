import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  // 多页面应用配置
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, 'src/views/login/login.html'),
        admin: resolve(__dirname, 'src/views/admin/admin.html'),
        teacher: resolve(__dirname, 'src/views/teacher/teacher.html'),
        shiyan: resolve(__dirname, 'src/views/shiyan/shiyan.html'),
      },
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    // API 代理到后端服务器
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
