<script setup lang="ts">
import { useOnline } from '@/composables/useOnline'

const { isOnline, showReconnected } = useOnline()
</script>

<template>
  <div
    v-if="!isOnline"
    class="flex w-full items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-sm font-medium text-white"
    role="status"
    aria-live="polite"
  >
    <span class="inline-block h-2 w-2 rounded-full bg-white/70" aria-hidden="true" />
    You're offline — changes will sync when reconnected
  </div>
  <div
    v-else-if="showReconnected"
    class="flex w-full items-center justify-center gap-2 bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white"
    role="status"
    aria-live="polite"
  >
    <span class="inline-block h-2 w-2 rounded-full bg-white/70" aria-hidden="true" />
    Back online
  </div>
</template>
