<script setup lang="ts">
import { JazzVueProvider } from 'community-jazz-vue'
import { type SyncConfig, SubscriptionScope } from 'jazz-tools'
import { h } from 'vue'
import App from './App.vue'

const isDev = import.meta.env.DEV

if (isDev) {
  SubscriptionScope.enableProfiling()
  const modules = import.meta.glob('/node_modules/jazz-tools/dist/inspector/custom-element-*.js')
  for (const path of Object.keys(modules)) {
    modules[path]?.()
  }
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
