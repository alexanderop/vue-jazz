import { ref } from 'vue'

const mockChat = ref<unknown>(null)

vi.mock(import('community-jazz-vue'), () => ({
  useCoState: () => mockChat,
  createImage: vi.fn(),
  useAccount: () => ref(null),
}))

vi.mock(import('@/composables/useCurrentUser'), () => ({
  useCurrentUser: () => ref(null),
}))

const { useChat } = await import('@/composables/useChat')

function makeLoadedChat(messages: unknown[] = []) {
  return {
    $isLoaded: true,
    $jazz: { owner: {}, push: vi.fn() },
    length: messages.length,
    slice: (start?: number) => messages.slice(start),
    filter: (fn: (item: unknown) => boolean) => messages.filter(fn),
  }
}

describe('useChat', () => {
  describe('sendMessage', () => {
    it('does nothing when input is empty', () => {
      mockChat.value = makeLoadedChat()
      const { sendMessage, inputValue } = useChat('test-id' as unknown)
      inputValue.value = ''
      sendMessage()
      expect(inputValue.value).toBe('')
      mockChat.value = null
    })

    it('does nothing when input is only whitespace', () => {
      mockChat.value = makeLoadedChat()
      const { sendMessage, inputValue } = useChat('test-id' as unknown)
      inputValue.value = '   \n\t  '
      sendMessage()
      expect(inputValue.value).toBe('   \n\t  ')
      mockChat.value = null
    })

    it('does nothing when chat is not loaded', () => {
      mockChat.value = null
      const { sendMessage, inputValue } = useChat('test-id' as unknown)
      inputValue.value = 'Hello'
      sendMessage()
      expect(inputValue.value).toBe('Hello')
    })

    it('clears input and pushes message when chat is loaded', () => {
      const chat = makeLoadedChat()
      mockChat.value = chat
      const { sendMessage, inputValue } = useChat('test-id' as unknown)
      inputValue.value = 'Hello world'
      sendMessage()
      expect(inputValue.value).toBe('')
      expect(chat.$jazz.push).toHaveBeenCalledWith({ text: 'Hello world' })
      mockChat.value = null
    })
  })

  describe('sendImage', () => {
    it('rejects files over 5MB', async () => {
      mockChat.value = makeLoadedChat()
      const { sendImage, uploadError } = useChat('test-id' as unknown)
      const bigFile = new File(['x'.repeat(5_000_001)], 'big.png', { type: 'image/png' })
      await sendImage(bigFile)
      expect(uploadError.value).toBe('Please upload an image less than 5MB.')
      mockChat.value = null
    })

    it('does nothing when chat is not loaded', async () => {
      mockChat.value = null
      const { sendImage, uploadError, isUploading } = useChat('test-id' as unknown)
      const file = new File(['data'], 'small.png', { type: 'image/png' })
      await sendImage(file)
      expect(uploadError.value).toBe('')
      expect(isUploading.value).toBeFalsy()
    })
  })

  describe('displayedMessages', () => {
    it('returns empty array when chat is not loaded', () => {
      mockChat.value = null
      const { displayedMessages } = useChat('test-id' as unknown)
      expect(displayedMessages.value).toEqual([])
    })

    it('returns last 30 messages by default', () => {
      const msgs = Array.from({ length: 40 }, (_, i) => ({ text: `msg-${i}` }))
      mockChat.value = makeLoadedChat(msgs)
      const { displayedMessages } = useChat('test-id' as unknown)
      expect(displayedMessages.value).toHaveLength(30)
      expect(displayedMessages.value[0]).toEqual({ text: 'msg-10' })
      mockChat.value = null
    })

    it('shows all messages when fewer than 30', () => {
      const msgs = [{ text: 'a' }, { text: 'b' }]
      mockChat.value = makeLoadedChat(msgs)
      const { displayedMessages } = useChat('test-id' as unknown)
      expect(displayedMessages.value).toHaveLength(2)
      mockChat.value = null
    })
  })

  describe('hasMore + showMore', () => {
    it('hasMore is true when messages exceed display limit', () => {
      const msgs = Array.from({ length: 40 }, (_, i) => ({ text: `msg-${i}` }))
      mockChat.value = makeLoadedChat(msgs)
      const { hasMore } = useChat('test-id' as unknown)
      expect(hasMore.value).toBeTruthy()
      mockChat.value = null
    })

    it('hasMore is false when messages fit display limit', () => {
      const msgs = [{ text: 'a' }]
      mockChat.value = makeLoadedChat(msgs)
      const { hasMore } = useChat('test-id' as unknown)
      expect(hasMore.value).toBeFalsy()
      mockChat.value = null
    })

    it('showMore increases displayed message count by 10', () => {
      const msgs = Array.from({ length: 50 }, (_, i) => ({ text: `msg-${i}` }))
      mockChat.value = makeLoadedChat(msgs)
      const { displayedMessages, showMore } = useChat('test-id' as unknown)
      expect(displayedMessages.value).toHaveLength(30)
      showMore()
      expect(displayedMessages.value).toHaveLength(40)
      mockChat.value = null
    })
  })
})
