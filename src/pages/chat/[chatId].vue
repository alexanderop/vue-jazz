<route lang="json5">
{ props: true }
</route>

<script setup lang="ts">
import type { ID } from 'jazz-tools'
import type { Chat } from '@/schema'
import { useChat, LAST_CHAT_KEY } from '@/composables/useChat'
import { BaseSkeleton } from '@/components/ui/skeleton'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import ChatInputForm from '@/components/chat/ChatInputForm.vue'

const { chatId } = defineProps<{ chatId: ID<typeof Chat> }>()

localStorage.setItem(LAST_CHAT_KEY, chatId)

const {
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
} = useChat(() => chatId)
</script>

<template>
  <div v-if="isLoaded" class="flex flex-1 flex-col overflow-hidden">
    <ChatMessageList
      :messages="displayedMessages"
      :me-id="me!.$jazz.id"
      :has-more="hasMore"
      @show-more="showMore"
    />
    <ChatInputForm
      v-model="inputValue"
      :upload-error="uploadError"
      :is-uploading="isUploading"
      @submit="sendMessage"
      @upload="sendImage"
    />
  </div>

  <div v-else class="flex flex-1 items-center justify-center" role="status">
    <div class="flex flex-col items-center gap-3">
      <span class="sr-only">Loading...</span>
      <BaseSkeleton class="h-4 w-48" />
      <BaseSkeleton class="h-4 w-32" />
    </div>
  </div>
</template>
