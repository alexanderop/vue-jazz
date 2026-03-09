import { watch, nextTick, type Ref } from 'vue'

export function useFocusOnShow(trigger: Ref<boolean>, containerRef: Ref<HTMLElement | null>) {
  watch(trigger, async (show) => {
    if (show) {
      await nextTick()
      containerRef.value?.querySelector<HTMLElement>('button')?.focus()
    }
  })
}
