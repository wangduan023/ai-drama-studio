import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 20000,
    env: {
      DATABASE_PROVIDER: 'sqlite',
      DATABASE_URL: 'file:./test.db',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/db',
      exclude: [
        'node_modules/',
        '__tests__/',
        'src/types.ts',
        'src/index.ts',
      ],
    },
  },
})
