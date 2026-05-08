import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    // Explicitly override tsconfig's jsxImportSource: PixiJS JSX is not used in tests
    react({ jsxImportSource: 'react' }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
