<script setup lang="ts">
import { JazzVueProvider } from 'community-jazz-vue'
import type { SyncConfig } from 'jazz-tools'
import { h } from 'vue'
import App from './App.vue'

const isDev = import.meta.env.DEV
if (isDev) {
  import('jazz-tools/inspector/register-custom-element')
}

const characters = [
  'Luffy',
  'Zoro',
  'Nami',
  'Usopp',
  'Sanji',
  'Chopper',
  'Robin',
  'Franky',
  'Brook',
  'Jinbe',
]

function getRandomUsername() {
  return `Anonymous ${characters[Math.floor(Math.random() * characters.length)]}`
}

const peer =
  `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY ?? 'you@example.com'}` as const
const sync: SyncConfig = { peer }
const defaultProfileName = getRandomUsername()
</script>

<template>
  <JazzVueProvider :sync="sync" :defaultProfileName="defaultProfileName">
    <App />
    <component
      v-if="isDev"
      :is="
        h('jazz-inspector', {
          style: { position: 'fixed', left: '20px', bottom: '20px', zIndex: 9999 },
        })
      "
    />
  </JazzVueProvider>
</template>
