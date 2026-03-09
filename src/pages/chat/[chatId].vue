<route lang="json5">
{ props: true }
</route>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccount, useCoState, createImage } from 'community-jazz-vue'
import type { ID } from 'jazz-tools'
import { Chat } from '@/schema'
import { BaseButton } from '@/components/ui/button'
import { BaseInput } from '@/components/ui/input'
import { BaseSkeleton } from '@/components/ui/skeleton'
import ChatBubble from '@/components/chat/ChatBubble.vue'

const INITIAL_MESSAGES_TO_SHOW = 30
const MAX_IMAGE_SIZE_BYTES = 5_000_000

const { chatId } = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, () => chatId, {
  resolve: { $each: { text: true, image: true } },
})
const me = useAccount(undefined, { resolve: { profile: true } })

const showNLastMessages = ref(INITIAL_MESSAGES_TO_SHOW)
const inputValue = ref('')
const uploadError = ref('')
const isUploading = ref(false)

const isLoaded = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)

const displayedMessages = computed(() => {
  const c = chat.value
  if (!c?.$isLoaded) return []
  return c.slice(-showNLastMessages.value).filter(Boolean).toReversed()
})

function sendMessage() {
  const c = chat.value
  if (!inputValue.value.trim() || !c?.$isLoaded) return
  c.$jazz.push({ text: inputValue.value })
  inputValue.value = ''
}

async function sendImage(event: Event) {
  const c = chat.value
  if (!c?.$isLoaded) return

  uploadError.value = ''

  const { target } = event
  if (!(target instanceof HTMLInputElement)) return
  const file = target.files?.[0]
  if (!file) return

  // Reset file input so re-selecting the same file triggers change
  target.value = ''

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
</script>

<template>
  <template v-if="isLoaded">
    <div class="flex flex-1 flex-col-reverse overflow-y-auto" role="log" aria-label="Chat messages">
      <template v-if="chat?.$isLoaded && chat.length > 0">
        <ChatBubble
          v-for="msg in displayedMessages"
          :key="msg.$jazz.id"
          :msg="msg"
          :me-id="me!.$jazz.id"
        />
      </template>
      <div
        v-else
        class="flex h-full items-center justify-center px-3 text-base text-stone-600 md:text-2xl"
      >
        Start a conversation below.
      </div>
      <BaseButton
        v-if="chat?.$isLoaded && chat.length > showNLastMessages"
        variant="outline"
        size="sm"
        class="mx-auto my-2"
        @click="showMore"
      >
        Show more
      </BaseButton>
    </div>

    <p v-if="uploadError" class="px-3 text-sm text-red-500" role="alert">
      {{ uploadError }}
    </p>
    <form
      class="mt-auto flex gap-1 bg-stone-100 px-3 pb-3 pt-1 dark:border-stone-900 dark:bg-transparent"
      @submit.prevent="sendMessage"
    >
      <label
        class="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-200"
        :class="{ 'pointer-events-none opacity-50': isUploading }"
      >
        <span class="sr-only">Send image</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <input
          type="file"
          accept="image/png, image/jpeg, image/gif"
          class="hidden"
          :disabled="isUploading"
          @change="sendImage"
        />
      </label>
      <div class="relative flex-1">
        <label for="chat-message-input" class="sr-only">Type a message and press Enter</label>
        <BaseInput
          id="chat-message-input"
          v-model="inputValue"
          class="h-10 w-full rounded-full border-stone-400 px-4 dark:border-stone-900 dark:bg-stone-925"
          placeholder="Message"
          maxlength="2048"
          :disabled="isUploading"
        />
      </div>
    </form>
  </template>

  <div v-else class="flex flex-1 items-center justify-center" role="status">
    <div class="flex flex-col items-center gap-3">
      <span class="sr-only">Loading...</span>
      <BaseSkeleton class="h-4 w-48" />
      <BaseSkeleton class="h-4 w-32" />
    </div>
  </div>
</template>
