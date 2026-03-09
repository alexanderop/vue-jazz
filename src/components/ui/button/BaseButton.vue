<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { type ButtonVariants, buttonVariants } from '.'

const {
  variant = 'default',
  size = 'default',
  class: className,
} = defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <button
    type="button"
    data-slot="button"
    :class="cn(buttonVariants({ variant, size }), className)"
  >
    <slot />
  </button>
</template>
