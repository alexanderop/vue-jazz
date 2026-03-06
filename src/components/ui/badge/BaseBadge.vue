<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { type BadgeVariants, badgeVariants } from '.'

const { variant = 'default', class: className } = defineProps<{
  variant?: BadgeVariants['variant']
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="badge" :class="cn(badgeVariants({ variant }), className)">
    <slot />
  </div>
</template>
