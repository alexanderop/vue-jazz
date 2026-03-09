<script setup lang="ts">
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useFocusOnShow } from '@/composables/useFocusOnShow'
import { BaseButton } from './ui/button'

const { needRefresh, updateServiceWorker } = useRegisterSW()
const containerRef = ref<HTMLElement | null>(null)

useFocusOnShow(needRefresh, containerRef)
</script>

<template>
  <div
    v-if="needRefresh"
    ref="containerRef"
    class="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-white"
    role="alert"
  >
    <p class="m-0 text-sm">New content available, click reload to update.</p>
    <div class="flex gap-2">
      <BaseButton size="sm" @click="updateServiceWorker()">Reload</BaseButton>
      <BaseButton variant="outline" size="sm" @click="needRefresh = false">Close</BaseButton>
    </div>
  </div>
</template>
