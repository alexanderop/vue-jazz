import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      coverage: {
        provider: 'v8',
        exclude: [
          'node_modules/**',
          'dist/**',
          'dev-dist/**',
          'coverage/**',
          'test/**',
          '**/*.config.{ts,js}',
          '**/*.d.ts',
        ],
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['test/unit/**/*.spec.ts'],
          },
        },
        {
          extends: true,
          optimizeDeps: {
            include: ['vue-router'],
          },
          test: {
            name: 'component',
            include: ['test/component/**/*.spec.ts'],
            setupFiles: ['test/setup/component.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
