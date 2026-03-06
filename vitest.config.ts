import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts'],
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
    },
  }),
)
