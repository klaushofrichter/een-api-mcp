import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Root directory for tests
    root: '.',

    // Include patterns
    include: ['test/**/*.test.ts', 'test/integration/**/*.test.ts'],

    // Timeout for integration tests (API calls can be slow)
    testTimeout: 60000,

    // Report style
    reporters: ['verbose'],

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**/*.ts']
    }
  }
})
