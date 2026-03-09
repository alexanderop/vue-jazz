import { ref } from 'vue'

const mockIsOnline = ref(true)
const mockStart = vi.fn()
const mockStop = vi.fn()

vi.mock(import('@vueuse/core'), () => ({
  useNetwork: () => ({ isOnline: mockIsOnline }),
  useTimeoutFn: (cb: () => void, _delay: number, _opts: unknown) => ({
    start: () => {
      mockStart()
      // Simulate timeout firing
      setTimeout(cb, 0)
    },
    stop: mockStop,
  }),
}))

describe('useOnline', () => {
  it('returns online state', async () => {
    vi.resetModules()
    mockIsOnline.value = true
    mockStart.mockClear()
    mockStop.mockClear()

    const { useOnline } = await import('@/composables/useOnline')
    const { isOnline } = useOnline()
    expect(isOnline.value).toBeTruthy()
  })

  it('initializes showReconnected as false', async () => {
    vi.resetModules()
    mockIsOnline.value = true
    mockStart.mockClear()
    mockStop.mockClear()

    const { useOnline } = await import('@/composables/useOnline')
    const { showReconnected } = useOnline()
    expect(showReconnected.value).toBeFalsy()
  })
})
