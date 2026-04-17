import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__test__/setup.js'],
    include: ['__test__/**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    css: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
