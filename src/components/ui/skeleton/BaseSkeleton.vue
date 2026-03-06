<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const { class: className } = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="skeleton" :class="cn('animate-pulse rounded-md bg-neutral-900/10', className)" />
</template>
