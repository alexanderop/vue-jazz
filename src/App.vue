<script setup lang="ts">
import { useLogOut } from 'community-jazz-vue'
import { BaseInput } from '@/components/ui/input'
import { useProfileEditor } from '@/composables/useProfileEditor'
import { useChatIdClipboard } from '@/composables/useChatIdClipboard'
import ReloadPrompt from './components/ReloadPrompt.vue'
import InstallPrompt from './components/InstallPrompt.vue'
import NetworkStatus from './components/NetworkStatus.vue'

const { me, usernameWidth, updateName } = useProfileEditor()
const { chatId, copied, copyId } = useChatIdClipboard()
const logOut = useLogOut()
</script>

<template>
  <div class="flex h-screen w-screen flex-col bg-stone-100 dark:bg-stone-925 dark:text-white">
    <NetworkStatus />
    <h1 class="sr-only">Vue Jazz Chat</h1>
    <header
      v-if="me.$isLoaded"
      class="flex w-full items-center gap-2 bg-stone-100 px-3 pb-3 pt-2 dark:border-stone-900 dark:bg-transparent"
    >
      <BaseInput
        type="text"
        aria-label="Username"
        :model-value="me.profile?.name"
        :style="{ width: usernameWidth }"
        class="h-auto min-w-0 max-w-full rounded-none border-none bg-transparent px-0 py-0 text-lg shadow-none outline-none focus-visible:ring-0"
        placeholder="Set username"
        @update:model-value="updateName"
      />
      <button
        v-if="chatId"
        type="button"
        class="ml-auto flex items-center gap-1 rounded bg-stone-200 px-2 py-0.5 font-mono text-xs text-stone-600 transition-colors hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
        @click="copyId"
      >
        <span>{{ copied ? 'Copied!' : chatId.slice(0, 12) + '…' }}</span>
      </button>
      <button type="button" class="cursor-pointer" :class="{ 'ml-auto': !chatId }" @click="logOut">
        Log out
      </button>
    </header>
    <main class="flex flex-1 flex-col overflow-hidden">
      <router-view />
    </main>
    <ReloadPrompt />
    <InstallPrompt />
  </div>
</template>
