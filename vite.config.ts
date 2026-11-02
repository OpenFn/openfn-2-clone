import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  base: '/openfn-3-poc/',
  plugins: [react(), tailwindcss()],
  test: {
    // Monaco rejects its pending timers with "Canceled" when a story unmounts.
    onUnhandledError: (error) => error.message !== 'Canceled',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // source-layout.test.ts globs src; a cached compile misses files added since.
          fsModuleCache: false,
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
          // Testing Library unmounts between tests only when afterEach is global.
          globals: true,
        },
      },
      {
        // Renders every story in Chromium and fails it on axe violations (`npm run test:stories`).
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
