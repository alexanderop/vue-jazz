<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chat } from '@/schema'
import { BaseSkeleton } from '@/components/ui/skeleton'

const router = useRouter()

onMounted(() => {
  const chat = Chat.create([])
  router.push({ name: '/chat/[chatId]', params: { chatId: chat.$jazz.id } })
})
</script>

<template>
  <div class="flex flex-1 items-center justify-center" role="status">
    <span class="sr-only">Loading...</span>
    <BaseSkeleton class="h-4 w-40" />
  </div>
</template>
