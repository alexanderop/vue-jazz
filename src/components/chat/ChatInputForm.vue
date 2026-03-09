<script setup lang="ts">
import { BaseInput } from '@/components/ui/input'

const { modelValue, uploadError, isUploading } = defineProps<{
  modelValue: string
  uploadError: string
  isUploading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  submit: []
  upload: [event: Event]
}>()
</script>

<template>
  <p v-if="uploadError" class="px-3 text-sm text-red-500" role="alert">
    {{ uploadError }}
  </p>
  <form
    class="mt-auto flex gap-1 bg-stone-100 px-3 pb-3 pt-1 dark:border-stone-900 dark:bg-transparent"
    @submit.prevent="emit('submit')"
  >
    <label
      class="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-200"
      :class="{ 'pointer-events-none opacity-50': isUploading }"
    >
      <span class="sr-only">Send image</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
      <input
        type="file"
        accept="image/png, image/jpeg, image/gif"
        class="hidden"
        :disabled="isUploading"
        @change="emit('upload', $event)"
      />
    </label>
    <div class="relative flex-1">
      <label for="chat-message-input" class="sr-only">Type a message and press Enter</label>
      <BaseInput
        id="chat-message-input"
        :model-value="modelValue"
        class="h-10 w-full rounded-full border-stone-400 px-4 dark:border-stone-900 dark:bg-stone-925"
        placeholder="Message"
        maxlength="2048"
        :disabled="isUploading"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </form>
</template>
