import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useClipboard } from '@vueuse/core'

export function useChatIdClipboard() {
  const route = useRoute()

  const chatId = computed<string | undefined>(() => {
    if (!('chatId' in route.params)) return undefined
    const id = route.params.chatId
    return Array.isArray(id) ? id[0] : id
  })

  const { copy, copied } = useClipboard({ copiedDuring: 1500 })

  function copyId() {
    if (chatId.value) copy(chatId.value)
  }

  return { chatId, copied, copyId }
}
