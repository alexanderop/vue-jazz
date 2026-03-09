import { ref } from 'vue'

export function mockPwaModules() {
  vi.mock('virtual:pwa-register/vue', () => ({
    useRegisterSW: () => ({
      needRefresh: ref(false),
      updateServiceWorker: vi.fn(),
    }),
  }))
}
