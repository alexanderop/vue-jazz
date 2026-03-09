import { ref } from 'vue'

const mockCopy = vi.fn()
const mockCopied = ref(false)

vi.mock(import('vue-router'), () => ({
  useRoute: () => ({
    params: { chatId: 'co_abc123' },
  }),
}))

vi.mock(import('@vueuse/core'), () => ({
  useClipboard: () => ({
    copy: mockCopy,
    copied: mockCopied,
  }),
}))

const { useChatIdClipboard } = await import('@/composables/useChatIdClipboard')

describe('useChatIdClipboard', () => {
  it('extracts chatId from route params', () => {
    const { chatId } = useChatIdClipboard()
    expect(chatId.value).toBe('co_abc123')
  })

  it('exposes copied state from useClipboard', () => {
    const { copied } = useChatIdClipboard()
    expect(copied.value).toBeFalsy()
  })

  it('calls copy with chatId when copyId is invoked', () => {
    const { copyId } = useChatIdClipboard()
    copyId()
    expect(mockCopy).toHaveBeenCalledWith('co_abc123')
  })
})
