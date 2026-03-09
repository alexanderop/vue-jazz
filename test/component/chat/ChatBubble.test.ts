import { mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import { createMockMessage } from '../../fixtures/jazz/messages'
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

const ChatBubble = (await import('@/components/chat/ChatBubble.vue')).default

describe('chatBubble', () => {
  const meId = 'co_account_001'

  it('renders message text', () => {
    const msg = createMockMessage({ text: 'Hello!' })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    expect(wrapper.text()).toContain('Hello!')
  })

  it('aligns own messages to the right', () => {
    const msg = createMockMessage({ $jazz: { createdBy: meId } })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    expect(wrapper.find('.flex').classes()).toContain('items-end')
  })

  it('aligns other messages to the left', () => {
    const msg = createMockMessage({ $jazz: { createdBy: 'co_other' } })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    expect(wrapper.find('.flex').classes()).toContain('items-start')
  })

  it('applies own-message styling', () => {
    const msg = createMockMessage({ $jazz: { createdBy: meId } })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    const bubble = wrapper.find('.rounded-2xl')
    expect(bubble.classes()).toContain('bg-white')
  })

  it('applies other-message styling', () => {
    const msg = createMockMessage({ $jazz: { createdBy: 'co_other' } })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    const bubble = wrapper.find('.rounded-2xl')
    expect(bubble.classes()).toContain('bg-blue')
  })

  it('renders ChatImage when message has image', () => {
    const msg = createMockMessage({
      image: { $jazz: { id: 'co_img_001' } },
    })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    expect(wrapper.find('img').exists()).toBeTruthy()
  })

  it('does not render ChatImage when message has no image', () => {
    const msg = createMockMessage({ image: null })
    const wrapper = mount(ChatBubble, { props: { msg, meId } })
    expect(wrapper.find('img').exists()).toBeFalsy()
  })
})
