export function createMockMessage(overrides: Record<string, unknown> = {}) {
  const { $jazz: jazzOverrides, ...rest } = overrides
  return {
    text: 'Hello world',
    image: null,
    ...rest,
    $jazz: {
      id: `co_msg_${Math.random().toString(36).slice(2, 8)}`,
      createdBy: 'co_account_001',
      createdAt: new Date('2025-01-15T10:30:00Z').toISOString(),
      ...jazzOverrides,
    },
  }
}

export function createMockMessages(count: number, createdBy = 'co_account_001') {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      text: `Message ${i + 1}`,
      $jazz: { createdBy, createdAt: new Date(2025, 0, 15, 10, i).toISOString() },
    }),
  )
}
