import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['src/pages/**/*.vue'],
  project: ['src/**/*.{ts,vue}'],
  ignoreDependencies: ['tailwindcss'],
}

export default config
