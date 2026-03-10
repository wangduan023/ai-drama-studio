import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/__tests__/',
        '**/types.ts',
        '**/index.ts',
        '**/*.d.ts',
        '**/vitest.config.ts',
        'coverage/',
      ],
      // 覆盖率阈值 (目标 80%+)
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
      //  always 报告覆盖率，即使测试失败
      reportOnFailure: true,
    },
  },
})
