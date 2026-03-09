import { mount } from '@vue/test-utils'
import { h } from 'vue'

vi.mock(import('community-jazz-vue'), () => ({
  Image: {
    name: 'Image',
    props: ['imageId', 'alt', 'height', 'width'],
    setup(props: { imageId: string; alt: string }) {
      return () => h('img', { src: `/mock/${props.imageId}`, alt: props.alt })
    },
  },
}))

const ChatImage = (await import('@/components/chat/ChatImage.vue')).default

describe('chatImage', () => {
  it('renders an image element', () => {
    const wrapper = mount(ChatImage, {
      props: { imageId: 'co_img_001', alt: 'Test image' },
    })
    expect(wrapper.find('img').exists()).toBeTruthy()
  })

  it('passes alt text to the image', () => {
    const wrapper = mount(ChatImage, {
      props: { imageId: 'co_img_001', alt: 'A photo' },
    })
    expect(wrapper.find('img').attributes('alt')).toBe('A photo')
  })

  it('passes imageId to the Image component', () => {
    const wrapper = mount(ChatImage, {
      props: { imageId: 'co_img_abc', alt: 'Photo' },
    })
    expect(wrapper.find('img').attributes('src')).toContain('co_img_abc')
  })
})
