import { mount } from '@vue/test-utils'
import { BaseCard } from '@/components/ui/card'

describe('baseCard', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'Card content' } })
    expect(wrapper.text()).toBe('Card content')
  })

  it('applies default card classes', () => {
    const wrapper = mount(BaseCard)
    expect(wrapper.classes()).toContain('rounded-xl')
    expect(wrapper.classes()).toContain('shadow-sm')
  })

  it('has data-slot attribute', () => {
    const wrapper = mount(BaseCard)
    expect(wrapper.attributes('data-slot')).toBe('card')
  })

  it('merges custom classes', () => {
    const wrapper = mount(BaseCard, { props: { class: 'my-card' } })
    expect(wrapper.classes()).toContain('my-card')
  })
})
