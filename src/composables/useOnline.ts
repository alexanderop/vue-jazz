import { ref } from 'vue'

const isOnline = ref(navigator.onLine)
const showReconnected = ref(false)

let reconnectTimer: ReturnType<typeof setTimeout> | null = null

globalThis.addEventListener('online', () => {
  isOnline.value = true
  showReconnected.value = true
  reconnectTimer = setTimeout(() => {
    showReconnected.value = false
  }, 3000)
})

globalThis.addEventListener('offline', () => {
  isOnline.value = false
  showReconnected.value = false
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
})

export function useOnline() {
  return { isOnline, showReconnected }
}
