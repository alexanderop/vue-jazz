import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockIsOnline = ref(true)
const mockShowReconnected = ref(false)

vi.mock(import('@/composables/useOnline'), () => ({
  useOnline: () => ({
    isOnline: mockIsOnline,
    showReconnected: mockShowReconnected,
  }),
}))

const NetworkStatus = (await import('@/components/NetworkStatus.vue')).default

function resetMocks() {
  mockIsOnline.value = true
  mockShowReconnected.value = false
}

describe('networkStatus', () => {
  it('shows nothing when online and not reconnected', () => {
    resetMocks()
    const wrapper = mount(NetworkStatus)
    expect(wrapper.find('[role="status"]').exists()).toBeFalsy()
  })

  it('shows offline banner when offline', () => {
    resetMocks()
    mockIsOnline.value = false
    const wrapper = mount(NetworkStatus)
    const status = wrapper.find('[role="status"]')
    expect(status.exists()).toBeTruthy()
    expect(status.text()).toContain("You're offline")
  })

  it('applies amber styling when offline', () => {
    resetMocks()
    mockIsOnline.value = false
    const wrapper = mount(NetworkStatus)
    expect(wrapper.find('.bg-amber-500').exists()).toBeTruthy()
  })

  it('shows reconnected banner', () => {
    resetMocks()
    mockShowReconnected.value = true
    const wrapper = mount(NetworkStatus)
    const status = wrapper.find('[role="status"]')
    expect(status.exists()).toBeTruthy()
    expect(status.text()).toContain('Back online')
  })

  it('applies emerald styling when reconnected', () => {
    resetMocks()
    mockShowReconnected.value = true
    const wrapper = mount(NetworkStatus)
    expect(wrapper.find('.bg-emerald-500').exists()).toBeTruthy()
  })

  it('has aria-live="polite" for accessibility', () => {
    resetMocks()
    mockIsOnline.value = false
    const wrapper = mount(NetworkStatus)
    expect(wrapper.find('[aria-live="polite"]').exists()).toBeTruthy()
  })
})
