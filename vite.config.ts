import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const isolationHeadersPlugin = () => ({
  name: 'isolation-headers',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const originalSetHeader = res.setHeader;
      res.setHeader = function (name: string, value: any) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'cross-origin-opener-policy') value = 'same-origin';
        else if (lowerName === 'cross-origin-embedder-policy') value = 'require-corp';
        else if (lowerName === 'cross-origin-resource-policy') value = 'same-origin';
        else if (lowerName === 'x-content-type-options') value = 'nosniff';
        return originalSetHeader.call(this, name, value);
      };

      const originalWriteHead = res.writeHead;
      res.writeHead = function (this: any, statusCode: any, ...args: any[]) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return originalWriteHead.apply(this, [statusCode, ...args]);
      };

      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    });

    const middleware = server.middlewares.stack.pop();
    if (middleware) {
      server.middlewares.stack.unshift(middleware);
    }
  },
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const originalSetHeader = res.setHeader;
      res.setHeader = function (name: string, value: any) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'cross-origin-opener-policy') value = 'same-origin';
        else if (lowerName === 'cross-origin-embedder-policy') value = 'require-corp';
        else if (lowerName === 'cross-origin-resource-policy') value = 'same-origin';
        else if (lowerName === 'x-content-type-options') value = 'nosniff';
        return originalSetHeader.call(this, name, value);
      };

      const originalWriteHead = res.writeHead;
      res.writeHead = function (this: any, statusCode: any, ...args: any[]) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return originalWriteHead.apply(this, [statusCode, ...args]);
      };

      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    });

    const middleware = server.middlewares.stack.pop();
    if (middleware) {
      server.middlewares.stack.unshift(middleware);
    }
  }
});

export default defineConfig({
  plugins: [
    isolationHeadersPlugin(),
    tailwindcss(),
    sveltekit()
  ],
  worker: {
    // Support modern ES module formatting for Stockfish and Web Workers
    format: 'es'
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.svelte-kit', 'tests/e2e/**/*']
  },
  server: {
    // LineWiki 로컬 개발 환경용 포트 및 개발 서버 설정 (기본 포트: 3000)
    port: 3000,
    strictPort: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
    headers: {
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff'
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    headers: {
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff'
    }
  }
});
