import { ref, nextTick } from 'vue'
import { useFocusOnShow } from '@/composables/useFocusOnShow'

function createMockContainer(queryResult: { focus: ReturnType<typeof vi.fn> } | null = null) {
  const container = {
    querySelector: vi.fn().mockReturnValue(queryResult),
  }
  return container as unknown as HTMLElement
}

describe(useFocusOnShow, () => {
  it('focuses the first button when trigger becomes true', async () => {
    const trigger = ref(false)
    const button = { focus: vi.fn() }
    const container = createMockContainer(button)
    const containerRef = ref<HTMLElement | null>(container)

    useFocusOnShow(trigger, containerRef)

    trigger.value = true
    await nextTick()
    await nextTick()

    expect(container.querySelector).toHaveBeenCalledWith('button')
    expect(button.focus).toHaveBeenCalled()
  })

  it('does nothing when trigger becomes false', async () => {
    const trigger = ref(true)
    const container = createMockContainer()
    const containerRef = ref<HTMLElement | null>(container)

    useFocusOnShow(trigger, containerRef)

    trigger.value = false
    await nextTick()
    await nextTick()

    expect(container.querySelector).not.toHaveBeenCalled()
  })

  it('handles null container ref gracefully', async () => {
    const trigger = ref(false)
    const containerRef = ref<HTMLElement | null>(null)

    useFocusOnShow(trigger, containerRef)

    trigger.value = true
    await nextTick()
    await nextTick()

    expect(containerRef.value).toBeNull()
  })
})
