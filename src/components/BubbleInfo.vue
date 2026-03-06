<script setup lang="ts">
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'

const { createdBy, createdAt } = defineProps<{
  createdBy?: string
  createdAt: number
}>()

const by = useCoState(Account, () => createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <div class="mb-1.5 h-4 text-xs text-neutral-500">
    <template v-if="by.$isLoaded">
      {{ by.profile?.name }} &middot;
      {{ new Date(createdAt).toLocaleTimeString('en-US', { hour12: false }) }}
    </template>
  </div>
</template>
