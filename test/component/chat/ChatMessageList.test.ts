import { mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import { createMockMessages } from '../../fixtures/jazz/messages'
import { createMockAccount } from '../../fixtures/jazz/accounts'

vi.mock(import('community-jazz-vue'), () => ({
  useCoState: () => ref(createMockAccount()),
  Image: {
    name: 'Image',
    props: ['imageId', 'alt', 'height', 'width'],
    setup(props: { imageId: string; alt: string }) {
      return () => h('img', { src: `/mock/${props.imageId}`, alt: props.alt })
    },
  },
}))

vi.mock(import('jazz-tools'), () => ({
  Account: {},
}))

const ChatMessageList = (await import('@/components/chat/ChatMessageList.vue')).default

describe('chatMessageList', () => {
  const meId = 'co_account_001'

  it('renders empty state when no messages', () => {
    const wrapper = mount(ChatMessageList, {
      props: { messages: [], meId, hasMore: false },
    })
    expect(wrapper.text()).toContain('Start a conversation below.')
  })

  it('renders messages when provided', () => {
    const messages = createMockMessages(3)
    const wrapper = mount(ChatMessageList, {
      props: { messages, meId, hasMore: false },
    })
    expect(wrapper.text()).toContain('Message 1')
    expect(wrapper.text()).toContain('Message 2')
    expect(wrapper.text()).toContain('Message 3')
  })

  it('shows "Show more" button when hasMore is true', () => {
    const messages = createMockMessages(2)
    const wrapper = mount(ChatMessageList, {
      props: { messages, meId, hasMore: true },
    })
    const btn = wrapper.find('[aria-label="Load older messages"]')
    expect(btn.exists()).toBeTruthy()
    expect(btn.text()).toBe('Show more')
  })

  it('hides "Show more" button when hasMore is false', () => {
    const wrapper = mount(ChatMessageList, {
      props: { messages: createMockMessages(1), meId, hasMore: false },
    })
    expect(wrapper.find('[aria-label="Load older messages"]').exists()).toBeFalsy()
  })

  it('emits show-more when button is clicked', async () => {
    const wrapper = mount(ChatMessageList, {
      props: { messages: createMockMessages(1), meId, hasMore: true },
    })
    await wrapper.find('[aria-label="Load older messages"]').trigger('click')
    expect(wrapper.emitted('show-more')?.length).toBeGreaterThanOrEqual(1)
  })

  it('has role="log" for accessibility', () => {
    const wrapper = mount(ChatMessageList, {
      props: { messages: [], meId, hasMore: false },
    })
    expect(wrapper.find('[role="log"]').exists()).toBeTruthy()
  })

  it('has aria-live="polite"', () => {
    const wrapper = mount(ChatMessageList, {
      props: { messages: [], meId, hasMore: false },
    })
    expect(wrapper.find('[aria-live="polite"]').exists()).toBeTruthy()
  })
})
