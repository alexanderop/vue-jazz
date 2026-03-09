<script setup lang="ts">
import { computed } from 'vue'
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'

const { createdBy, createdAt } = defineProps<{
  createdBy?: string
  createdAt: number
}>()

const date = computed(() => new Date(createdAt))
const formattedTime = computed(() => date.value.toLocaleTimeString('en-US', { hour12: false }))
const isoTime = computed(() => date.value.toISOString())

const by = useCoState(Account, () => createdBy, {
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
