import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createMockMessage } from '../../fixtures/jazz/messages'
import { createMockAccount } from '../../fixtures/jazz/accounts'

vi.mock(import('community-jazz-vue'), () => ({
  useCoState: () =>
    ref(
      createMockAccount({
        $isLoaded: true,
        profile: { name: 'Alice' },
      }),
    ),
}))

vi.mock(import('jazz-tools'), () => ({
  Account: {},
}))

const BubbleInfo = (await import('@/components/chat/BubbleInfo.vue')).default

describe('bubbleInfo', () => {
  it('displays username from account', () => {
    const msg = createMockMessage()
    const wrapper = mount(BubbleInfo, { props: { msg } })
    expect(wrapper.text()).toContain('Alice')
  })

  it('displays formatted time', () => {
    const msg = createMockMessage({
      $jazz: { createdAt: '2025-01-15T10:30:00Z' },
    })
    const wrapper = mount(BubbleInfo, { props: { msg } })
    const time = wrapper.find('time')
    expect(time.exists()).toBeTruthy()
    expect(time.attributes('datetime')).toBeDefined()
  })

  it('renders a time element with datetime attribute', () => {
    const msg = createMockMessage({
      $jazz: { createdAt: '2025-06-01T14:00:00Z' },
    })
    const wrapper = mount(BubbleInfo, { props: { msg } })
    const time = wrapper.find('time')
    expect(time.exists()).toBeTruthy()
    expect(time.attributes('datetime')).toContain('2025')
  })
})
