import { ref } from 'vue'
import { createMockAccount } from '../fixtures/jazz/accounts'

export function mockJazzModules() {
  vi.mock('community-jazz-vue', () => ({
    useCoState: (_type: unknown, idOrGetter: unknown, _opts?: unknown) => {
      const id = typeof idOrGetter === 'function' ? idOrGetter() : idOrGetter
      if (!id) return ref(null)
      return ref(createMockAccount())
    },
    useAccount: () => ref(createMockAccount()),
    createImage: vi.fn(),
    Image: {
      name: 'Image',
      props: ['imageId', 'alt', 'height', 'width'],
      template: '<img :src="\'/mock-image/\' + imageId" :alt="alt" />',
    },
    useLogOut: () => vi.fn(),
  }))

  vi.mock('jazz-tools', () => ({
    Account: {},
    co: { map: vi.fn(), list: vi.fn(), optional: vi.fn(), image: vi.fn() },
    z: { string: vi.fn() },
    setDefaultValidationMode: vi.fn(),
  }))
}
