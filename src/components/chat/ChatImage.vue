<script setup lang="ts">
import { Image } from 'community-jazz-vue'

const { imageId, alt } = defineProps<{
  imageId: string
  alt: string
}>()
</script>

<template>
  <Image
    :imageId="imageId"
    :alt="alt"
    class="mb-1 h-auto max-h-80 max-w-full rounded-t-xl object-contain"
    :height="600"
    :width="600"
  />
</template>
