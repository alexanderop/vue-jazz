import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockShowInstallPrompt = ref(true)
const mockShowIosPrompt = ref(false)
const mockCanInstall = ref(true)
const mockInstall = vi.fn()
const mockDismiss = vi.fn()

vi.mock(import('@/composables/usePwaInstall'), () => ({
  usePwaInstall: () => ({
    showInstallPrompt: mockShowInstallPrompt,
    showIosPrompt: mockShowIosPrompt,
    canInstall: mockCanInstall,
    isInstalled: ref(false),
    install: mockInstall,
    dismiss: mockDismiss,
  }),
}))

vi.mock(import('@/composables/useFocusOnShow'), () => ({
  useFocusOnShow: vi.fn(),
}))

const InstallPrompt = (await import('@/components/InstallPrompt.vue')).default

function resetMocks() {
  mockShowInstallPrompt.value = true
  mockShowIosPrompt.value = false
  mockCanInstall.value = true
  mockInstall.mockClear()
  mockDismiss.mockClear()
}

describe('installPrompt', () => {
  it('renders when showInstallPrompt is true', () => {
    resetMocks()
    const wrapper = mount(InstallPrompt)
    expect(wrapper.find('[role="alert"]').exists()).toBeTruthy()
  })

  it('does not render when showInstallPrompt is false', () => {
    resetMocks()
    mockShowInstallPrompt.value = false
    const wrapper = mount(InstallPrompt)
    expect(wrapper.find('[role="alert"]').exists()).toBeFalsy()
  })

  it('shows install button when canInstall is true', () => {
    resetMocks()
    const wrapper = mount(InstallPrompt)
    expect(wrapper.text()).toContain('Install')
  })

  it('shows dismiss button', () => {
    resetMocks()
    const wrapper = mount(InstallPrompt)
    expect(wrapper.text()).toContain('Dismiss')
  })

  it('shows iOS message when showIosPrompt is true', () => {
    resetMocks()
    mockShowIosPrompt.value = true
    const wrapper = mount(InstallPrompt)
    expect(wrapper.text()).toContain('Add to Home Screen')
  })

  it('shows standard message when not iOS', () => {
    resetMocks()
    const wrapper = mount(InstallPrompt)
    expect(wrapper.text()).toContain('Install Vue Jazz Chat')
  })

  it('calls dismiss when Dismiss button is clicked', async () => {
    resetMocks()
    const wrapper = mount(InstallPrompt)
    const buttons = wrapper.findAll('button')
    const dismissBtn = buttons.find((b) => b.text() === 'Dismiss')
    await dismissBtn?.trigger('click')
    expect(mockDismiss).toHaveBeenCalled()
  })
})
