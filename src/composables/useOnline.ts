import { ref, watch } from 'vue'
import { useNetwork, useTimeoutFn } from '@vueuse/core'

const { isOnline } = useNetwork()
const showReconnected = ref(false)

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

export function useOnline() {
  return { isOnline, showReconnected }
}
