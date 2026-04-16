import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const API_PROXY_TARGET =
  process.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:4001';

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
        if (url.startsWith('/exp')) {
          req.url = '/exp.html';
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

function runtimeInfoPlugin(): Plugin {
  return {
    name: 'runtime-info',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url || '') !== '/__runtime_info__') {
          return next();
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        res.end(
          JSON.stringify({
            app: 'fangzhen-fe',
            apiTarget: API_PROXY_TARGET,
          }),
        );
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackPlugin(), runtimeInfoPlugin()],

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
        exp: resolve(__dirname, 'exp.html'),
      },
    },
    chunkSizeWarningLimit: 600,
  },

  // 开发服务器配置
  server: {
    port: 4000,
    // API 代理到后端服务器（支持环境变量覆盖，用于 E2E 测试）
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },

  // Preview 服务器配置（用于预览生产构建）
  preview: {
    port: 4000,
  },
});
