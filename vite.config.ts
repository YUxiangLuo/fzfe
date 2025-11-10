import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// 自定义插件：处理 SPA 路由的 history fallback
function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // 如果是 API 请求或静态资源，跳过
        if (url.startsWith('/api') ||
            url.includes('.') ||
            url.startsWith('/@') ||
            url.startsWith('/node_modules')) {
          return next();
        }

        // 根据路径前缀返回对应的 HTML 文件
        if (url.startsWith('/shiyan')) {
          req.url = '/shiyan.html';
        } else if (url.startsWith('/teacher')) {
          req.url = '/teacher.html';
        } else if (url.startsWith('/admin')) {
          req.url = '/admin.html';
        } else if (url.startsWith('/login') || url === '/') {
          req.url = '/login.html';
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  // 多页面应用配置
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        admin: resolve(__dirname, 'admin.html'),
        teacher: resolve(__dirname, 'teacher.html'),
        shiyan: resolve(__dirname, 'shiyan.html'),
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

  // Preview 服务器配置（用于预览生产构建）
  preview: {
    port: 3000,
  },
});
