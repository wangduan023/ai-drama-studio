import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      '__tests__/unit/**/*.{test,spec}.{ts,tsx}',
      '__tests__/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      '.next',
      '**/*.d.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    // 测试报告
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-report.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types.ts',
        'test/',
        '__tests__/',
      ],
      thresholds: {
        global: {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
      },
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
