<script setup lang="ts">
import { computed } from 'vue'
import { Image } from 'community-jazz-vue'
import type { Message } from '../schema'
import BubbleInfo from './BubbleInfo.vue'

const { msg, meId } = defineProps<{
  msg: Message
  meId: string
}>()

const fromMe = computed(() => msg.$jazz.createdBy === meId)
</script>

<template>
  <div :class="[fromMe ? 'items-end' : 'items-start', 'flex flex-col m-3']" role="row">
    <BubbleInfo :createdBy="msg.$jazz.createdBy" :createdAt="msg.$jazz.createdAt" />
    <div
      :class="[
        'line-clamp-10 text-ellipsis whitespace-pre-wrap rounded-2xl overflow-hidden max-w-[calc(100%-5rem)] shadow-sm p-1',
        fromMe ? 'bg-white dark:bg-stone-900 dark:text-white' : 'bg-blue text-white',
      ]"
    >
      <Image
        v-if="msg.image"
        :imageId="msg.image.$jazz.id"
        class="mb-1 h-auto max-h-80 max-w-full rounded-t-xl object-contain"
        height="original"
        width="original"
      />
      <p class="px-2 leading-relaxed">{{ msg.text }}</p>
    </div>
  </div>
</template>
