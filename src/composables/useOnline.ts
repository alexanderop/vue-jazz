import { ref, watch, type Ref } from 'vue'
import { useNetwork, useTimeoutFn } from '@vueuse/core'

let isOnline: Ref<boolean>
let showReconnected: Ref<boolean>
let initialized = false

export function useOnline() {
  if (!initialized) {
    const { isOnline: onlineRef } = useNetwork()
    isOnline = onlineRef
    showReconnected = ref(false)

    const { start, stop } = useTimeoutFn(
      () => {
        showReconnected.value = false
      },
      3000,
      { immediate: false },
    )

    watch(isOnline, (online) => {
      if (online) {
        showReconnected.value = true
        start()
      } else {
        showReconnected.value = false
        stop()
      }
    })

    initialized = true
  }

  return { isOnline, showReconnected }
}
