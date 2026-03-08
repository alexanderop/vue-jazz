import { ref, onScopeDispose } from 'vue'

const isOnline = ref(navigator.onLine)
const showReconnected = ref(false)

let initialized = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function useOnline() {
  if (!initialized) {
    initialized = true

    const handleOnline = () => {
      isOnline.value = true
      showReconnected.value = true
      reconnectTimer = setTimeout(() => {
        showReconnected.value = false
      }, 3000)
    }

    const handleOffline = () => {
      isOnline.value = false
      showReconnected.value = false
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('offline', handleOffline)

    onScopeDispose(() => {
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('offline', handleOffline)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      initialized = false
    })
  }

  return { isOnline, showReconnected }
}
