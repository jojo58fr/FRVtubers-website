import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globalSetup: ['./vitest.setup.ts'],
    // Must be set before @/lib/prisma is imported in the workers.
    env: { DATABASE_URL: 'file:./test.db' },
    // Test files share one SQLite file: run them one at a time.
    fileParallelism: false,
  },
})
