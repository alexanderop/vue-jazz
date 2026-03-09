import { createMockMessages } from './messages'

export function createMockChat(messageCount = 0) {
  const messages = createMockMessages(messageCount)
  return Object.assign(messages, {
    $isLoaded: true,
    $jazz: {
      id: 'co_chat_001',
      owner: {},
      push: vi.fn(),
    },
  })
}
