import { mount } from '@vue/test-utils'
import ChatInputForm from '@/components/chat/ChatInputForm.vue'

describe('chatInputForm', () => {
  const defaultProps = {
    modelValue: '',
    uploadError: '',
    isUploading: false,
  }

  it('renders a form element', () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    expect(wrapper.find('form').exists()).toBeTruthy()
  })

  it('renders input with placeholder', () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    expect(wrapper.find('input[placeholder="Message"]').exists()).toBeTruthy()
  })

  it('displays upload error when provided', () => {
    const wrapper = mount(ChatInputForm, {
      props: { ...defaultProps, uploadError: 'File too large' },
    })
    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBeTruthy()
    expect(alert.text()).toBe('File too large')
  })

  it('hides upload error when empty', () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    expect(wrapper.find('[role="alert"]').exists()).toBeFalsy()
  })

  it('emits submit on form submission', async () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.length).toBeGreaterThanOrEqual(1)
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    await wrapper.find('input[placeholder="Message"]').setValue('hello')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })

  it('disables input when uploading', () => {
    const wrapper = mount(ChatInputForm, {
      props: { ...defaultProps, isUploading: true },
    })
    expect(wrapper.find('input[placeholder="Message"]').attributes('disabled')).toBeDefined()
  })

  it('has accessible label for message input', () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    expect(wrapper.find('label[for="chat-message-input"]').exists()).toBeTruthy()
  })

  it('has accessible label for image upload', () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    expect(wrapper.find('.sr-only').text()).toContain('Send image')
  })

  it('has file input accepting images', () => {
    const wrapper = mount(ChatInputForm, { props: defaultProps })
    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.exists()).toBeTruthy()
    expect(fileInput.attributes('accept')).toBe('image/png, image/jpeg, image/gif')
  })
})
