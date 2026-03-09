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
  <div class="flex flex-1 flex-col-reverse overflow-y-auto" role="log" aria-label="Chat messages">
    <template v-if="messages.length > 0">
      <ChatBubble v-for="msg in messages" :key="msg.$jazz.id" :msg="msg" :me-id="meId" />
    </template>
    <div
      v-else
      class="flex h-full items-center justify-center px-3 text-base text-stone-600 md:text-2xl"
    >
      Start a conversation below.
    </div>
    <BaseButton
      v-if="hasMore"
      variant="outline"
      size="sm"
      class="mx-auto my-2"
      @click="emit('show-more')"
    >
      Show more
    </BaseButton>
  </div>
</template>
