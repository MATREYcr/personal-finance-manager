import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Pin to UTC so date-arithmetic tests (e.g. recurring-transactions'
    // setMonth/setFullYear advancement, which mixes UTC-parsed Date strings
    // with local-time mutation methods) are deterministic regardless of the
    // contributor's or CI runner's system timezone.
    env: { TZ: 'UTC' },
  },
})
