import { computed, ref, type MaybeRefOrGetter } from 'vue'
import { useCoState, createImage } from 'community-jazz-vue'
import type { ID } from 'jazz-tools'
import { Chat } from '@/schema'
import { useCurrentUser } from './useCurrentUser'

export const LAST_CHAT_KEY = 'vue-jazz-last-chat-id'
const INITIAL_MESSAGES_TO_SHOW = 30
const MAX_IMAGE_SIZE_BYTES = 5_000_000

export function useChat(chatId: MaybeRefOrGetter<ID<typeof Chat>>) {
  const chat = useCoState(Chat, chatId, {
    resolve: { $each: { image: true } },
  })
  const me = useCurrentUser()

  const showNLastMessages = ref(INITIAL_MESSAGES_TO_SHOW)
  const inputValue = ref('')
  const uploadError = ref('')
  const isUploading = ref(false)

  const isLoaded = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)

  const displayedMessages = computed(() => {
    const c = chat.value
    if (!c?.$isLoaded) return []
    return c.slice(-showNLastMessages.value).filter(Boolean)
  })

  const hasMore = computed(() =>
    Boolean(chat.value?.$isLoaded && chat.value.length > showNLastMessages.value),
  )

  function sendMessage() {
    const c = chat.value
    if (!inputValue.value.trim() || !c?.$isLoaded) return
    c.$jazz.push({ text: inputValue.value })
    inputValue.value = ''
  }

  async function sendImage(file: File) {
    const c = chat.value
    if (!c?.$isLoaded) return
    uploadError.value = ''

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      uploadError.value = 'Please upload an image less than 5MB.'
      return
    }
    isUploading.value = true
    try {
      const image = await createImage(file, {
        owner: c.$jazz.owner,
        progressive: true,
        placeholder: 'blur',
      })
      c.$jazz.push({ text: file.name, image })
    } catch {
      uploadError.value = 'Failed to upload image. Please try again.'
    } finally {
      isUploading.value = false
    }
  }

  function showMore() {
    showNLastMessages.value += 10
  }

  return {
    chat,
    me,
    isLoaded,
    displayedMessages,
    hasMore,
    inputValue,
    uploadError,
    isUploading,
    sendMessage,
    sendImage,
    showMore,
  }
}
