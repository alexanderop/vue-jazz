import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockNeedRefresh = ref(false)
const mockUpdateSW = vi.fn()

vi.mock(import('virtual:pwa-register/vue'), () => ({
  useRegisterSW: () => ({
    needRefresh: mockNeedRefresh,
    updateServiceWorker: mockUpdateSW,
  }),
}))

vi.mock(import('@/composables/useFocusOnShow'), () => ({
  useFocusOnShow: vi.fn(),
}))

const ReloadPrompt = (await import('@/components/ReloadPrompt.vue')).default

function resetMocks() {
  mockNeedRefresh.value = false
  mockUpdateSW.mockClear()
}

describe('reloadPrompt', () => {
  it('does not render when needRefresh is false', () => {
    resetMocks()
    const wrapper = mount(ReloadPrompt)
    expect(wrapper.find('[role="alert"]').exists()).toBeFalsy()
  })

  it('renders when needRefresh is true', () => {
    resetMocks()
    mockNeedRefresh.value = true
    const wrapper = mount(ReloadPrompt)
    expect(wrapper.find('[role="alert"]').exists()).toBeTruthy()
  })

  it('shows reload message', () => {
    resetMocks()
    mockNeedRefresh.value = true
    const wrapper = mount(ReloadPrompt)
    expect(wrapper.text()).toContain('New content available')
  })

  it('shows Reload button', () => {
    resetMocks()
    mockNeedRefresh.value = true
    const wrapper = mount(ReloadPrompt)
    expect(wrapper.text()).toContain('Reload')
  })

  it('shows Close button', () => {
    resetMocks()
    mockNeedRefresh.value = true
    const wrapper = mount(ReloadPrompt)
    expect(wrapper.text()).toContain('Close')
  })

  it('calls updateServiceWorker when Reload is clicked', async () => {
    resetMocks()
    mockNeedRefresh.value = true
    const wrapper = mount(ReloadPrompt)
    const buttons = wrapper.findAll('button')
    const reloadBtn = buttons.find((b) => b.text() === 'Reload')
    await reloadBtn?.trigger('click')
    expect(mockUpdateSW).toHaveBeenCalled()
  })

  it('sets needRefresh to false when Close is clicked', async () => {
    resetMocks()
    mockNeedRefresh.value = true
    const wrapper = mount(ReloadPrompt)
    const buttons = wrapper.findAll('button')
    const closeBtn = buttons.find((b) => b.text() === 'Close')
    await closeBtn?.trigger('click')
    expect(mockNeedRefresh.value).toBeFalsy()
  })
})
