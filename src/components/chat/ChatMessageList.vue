<script setup lang="ts">
import type { Message } from '@/schema'
import { BaseButton } from '@/components/ui/button'
import ChatBubble from './ChatBubble.vue'

const { messages, meId, hasMore } = defineProps<{
  messages: Message[]
  meId: string
  hasMore: boolean
}>()

const emit = defineEmits<{
  'show-more': []
}>()
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-y-auto"
    role="log"
    aria-live="polite"
    aria-label="Chat messages"
  >
    <BaseButton
      v-if="hasMore"
      variant="outline"
      size="sm"
      class="mx-auto my-2"
      aria-label="Load older messages"
      @click="emit('show-more')"
    >
      Show more
    </BaseButton>
    <template v-if="messages.length > 0">
      <ChatBubble v-for="msg in messages" :key="msg.$jazz.id" :msg="msg" :me-id="meId" />
    </template>
    <div
      v-else
      class="flex h-full items-center justify-center px-3 text-base text-stone-600 dark:text-stone-400 md:text-2xl"
    >
      Start a conversation below.
    </div>
  </div>
</template>
