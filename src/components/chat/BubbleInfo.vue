<script setup lang="ts">
import { computed } from 'vue'
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'
import type { Message } from '@/schema'

const { msg } = defineProps<{
  msg: Message
}>()

const date = computed(() => new Date(msg.$jazz.createdAt))
const formattedTime = computed(() => date.value.toLocaleTimeString('en-US', { hour12: false }))
const isoTime = computed(() => date.value.toISOString())

const by = useCoState(Account, () => msg.$jazz.createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <div class="mb-1.5 h-4 text-xs text-neutral-600">
    <template v-if="by.$isLoaded">
      {{ by.profile?.name }} &middot;
      <time :datetime="isoTime">{{ formattedTime }}</time>
    </template>
  </div>
</template>
