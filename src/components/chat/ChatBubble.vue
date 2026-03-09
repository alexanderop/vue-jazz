<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/schema'
import BubbleInfo from './BubbleInfo.vue'
import ChatImage from './ChatImage.vue'

const { msg, meId } = defineProps<{
  msg: Message
  meId: string
}>()

const fromMe = computed(() => msg.$jazz.createdBy === meId)
</script>

<template>
  <div :class="[fromMe ? 'items-end' : 'items-start', 'flex flex-col m-3']">
    <BubbleInfo :msg="msg" />
    <div
      :class="[
        'line-clamp-10 text-ellipsis whitespace-pre-wrap rounded-2xl overflow-hidden max-w-[calc(100%-5rem)] shadow-sm p-1',
        fromMe ? 'bg-white dark:bg-stone-900 dark:text-white' : 'bg-blue text-white',
      ]"
    >
      <ChatImage
        v-if="msg.image"
        :imageId="msg.image.$jazz.id"
        :alt="String(msg.text || 'Shared image')"
      />
      <p class="px-2 leading-relaxed">{{ msg.text }}</p>
    </div>
  </div>
</template>
