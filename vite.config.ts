import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: true,
    cssMinify: 'esbuild',
  },
});
