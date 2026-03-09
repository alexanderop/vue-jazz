import { mount } from '@vue/test-utils'
import { BaseInput } from '@/components/ui/input'

describe('baseInput', () => {
  it('renders an input element', () => {
    const wrapper = mount(BaseInput)
    expect(wrapper.find('input').exists()).toBeTruthy()
  })

  it('binds v-model value', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 'hello' } })
    expect(wrapper.find('input').element.value).toBe('hello')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('typed')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['typed'])
  })

  it('merges custom classes', () => {
    const wrapper = mount(BaseInput, { props: { class: 'extra' } })
    expect(wrapper.find('input').classes()).toContain('extra')
  })

  it('has data-slot attribute', () => {
    const wrapper = mount(BaseInput)
    expect(wrapper.find('input').attributes('data-slot')).toBe('input')
  })
})
