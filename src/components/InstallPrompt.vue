<script setup lang="ts">
import { computed } from 'vue'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { BaseButton } from './ui/button'

const { showInstallPrompt, showIosPrompt, canInstall, install, dismiss } = usePwaInstall()

const message = computed(() => {
  if (showIosPrompt.value) {
    return 'Install this app: tap the share button and then "Add to Home Screen".'
  }
  return 'Install Vue Jazz Chat for the best experience.'
})
</script>

<template>
  <div
    v-if="showInstallPrompt"
    class="fixed bottom-4 left-4 right-4 z-[999] flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-white sm:left-auto sm:right-4 sm:max-w-sm"
    role="alert"
  >
    <p class="m-0 flex-1 text-sm">{{ message }}</p>
    <div class="flex shrink-0 gap-2">
      <BaseButton v-if="canInstall" size="sm" @click="install()">Install</BaseButton>
      <BaseButton variant="outline" size="sm" @click="dismiss()">Dismiss</BaseButton>
    </div>
  </div>
</template>
