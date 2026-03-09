import { mount } from '@vue/test-utils'
import { BaseButton } from '@/components/ui/button'

describe('baseButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toBe('Click me')
  })

  it('renders as a button element with type="button"', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('applies default variant classes', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.classes()).toContain('bg-neutral-900')
  })

  it('applies outline variant classes', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'outline' } })
    expect(wrapper.classes()).toContain('border')
  })

  it('applies sm size classes', () => {
    const wrapper = mount(BaseButton, { props: { size: 'sm' } })
    expect(wrapper.classes()).toContain('h-8')
  })

  it('merges custom classes', () => {
    const wrapper = mount(BaseButton, { props: { class: 'custom-class' } })
    expect(wrapper.classes()).toContain('custom-class')
  })

  it('emits click event', async () => {
    const wrapper = mount(BaseButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
