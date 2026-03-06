<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const { class: className } = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn('rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm', className)
    "
  >
    <slot />
  </div>
</template>
