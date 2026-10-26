import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Database tests against the local Supabase (npm run db:start first). */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
