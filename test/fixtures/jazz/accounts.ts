export function createMockAccount(overrides: Record<string, unknown> = {}) {
  return {
    $isLoaded: true,
    $jazz: {
      id: 'co_account_001',
      ...overrides.$jazz,
    },
    profile: {
      name: 'TestUser',
      ...overrides.profile,
    },
    ...overrides,
  }
}
