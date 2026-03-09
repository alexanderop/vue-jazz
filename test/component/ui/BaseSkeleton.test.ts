import { mount } from '@vue/test-utils'
import { BaseSkeleton } from '@/components/ui/skeleton'

describe('baseSkeleton', () => {
  it('renders a div element', () => {
    const wrapper = mount(BaseSkeleton)
    expect(wrapper.element.tagName).toBe('DIV')
  })

  it('applies animate-pulse class', () => {
    const wrapper = mount(BaseSkeleton)
    expect(wrapper.classes()).toContain('animate-pulse')
  })

  it('has data-slot attribute', () => {
    const wrapper = mount(BaseSkeleton)
    expect(wrapper.attributes('data-slot')).toBe('skeleton')
  })

  it('merges custom classes', () => {
    const wrapper = mount(BaseSkeleton, { props: { class: 'h-10 w-full' } })
    expect(wrapper.classes()).toContain('h-10')
    expect(wrapper.classes()).toContain('w-full')
  })
})
