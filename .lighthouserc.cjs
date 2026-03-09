module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm preview --port 9222',
      url: ['http://localhost:9222/'],
      startServerReadyPattern: 'Local',
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
