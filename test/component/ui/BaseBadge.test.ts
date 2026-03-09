import { mount } from '@vue/test-utils'
import { BaseBadge } from '@/components/ui/badge'

describe('baseBadge', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseBadge, { slots: { default: 'New' } })
    expect(wrapper.text()).toBe('New')
  })

  it('applies default variant classes', () => {
    const wrapper = mount(BaseBadge)
    expect(wrapper.classes()).toContain('bg-neutral-900')
  })

  it('applies secondary variant classes', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'secondary' } })
    expect(wrapper.classes()).toContain('bg-neutral-100')
  })

  it('applies destructive variant classes', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'destructive' } })
    expect(wrapper.classes()).toContain('bg-red-500')
  })

  it('applies outline variant classes', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'outline' } })
    expect(wrapper.classes()).toContain('text-neutral-950')
  })

  it('has data-slot attribute', () => {
    const wrapper = mount(BaseBadge)
    expect(wrapper.attributes('data-slot')).toBe('badge')
  })

  it('merges custom classes', () => {
    const wrapper = mount(BaseBadge, { props: { class: 'ml-2' } })
    expect(wrapper.classes()).toContain('ml-2')
  })
})
