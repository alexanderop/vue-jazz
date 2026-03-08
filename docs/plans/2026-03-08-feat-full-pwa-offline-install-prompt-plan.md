---
title: 'feat: Full PWA with Offline Support and Install Prompt'
type: feat
status: active
date: 2026-03-08
---

# Full PWA with Offline Support and Install Prompt

## Overview

Make the Vue Jazz Chat app a fully functional PWA that works offline and actively prompts users to install it. The app already has basic PWA infrastructure (vite-plugin-pwa, service worker, manifest, icons, ReloadPrompt). This plan addresses the gaps: missing Workbox config for offline SPA routing, no install prompt UI, no offline status indicator, and no iOS install guidance.

Jazz is local-first by design — data persists in IndexedDB and syncs via WebSocket when online. The service worker's job is caching the **app shell and static assets**, not the data layer.

## Problem Statement

Current gaps preventing full offline PWA experience:

1. **No `navigateFallback`** — navigating to `/chat/:chatId` offline returns a cache miss (no HTML matched). SPA routing is broken offline.
2. **No `globPatterns`** — not all static assets (HTML, fonts, WASM) are precached.
3. **No install prompt** — users are never asked to install the app. No `beforeinstallprompt` handling.
4. **No iOS install guidance** — iOS Safari doesn't support `beforeinstallprompt`; users need manual instructions.
5. **No offline indicator** — users have no visual feedback when disconnected.
6. **Manifest missing fields** — `display`, `start_url`, `background_color` are not set, which can prevent install prompts and cause UX issues.

## Proposed Solution

### Phase 1: Fix Workbox Config for True Offline Support

Update `vite.config.ts` to ensure the app shell loads offline on any route.

**File: `vite.config.ts`**

Add to the `VitePWA` config:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
  manifest: {
    name: 'Vue Jazz Chat',
    short_name: 'JazzChat',
    description: 'A real-time collaborative chat app',
    theme_color: '#ffffff',
    display: 'standalone', // ADD
    start_url: '/', // ADD
    background_color: '#f5f5f4', // ADD (stone-100)
    icons: [
      /* existing icons */
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'], // ADD
    navigateFallback: 'index.html', // ADD
    navigateFallbackAllowlist: [/^(?!\/__).*/], // ADD
    cleanupOutdatedCaches: true, // ADD
    runtimeCaching: [
      /* existing runtime caching rules */
    ],
  },
  devOptions: {
    enabled: false,
  },
})
```

**Changes explained:**

| Setting                          | Why                                                                      |
| -------------------------------- | ------------------------------------------------------------------------ |
| `display: 'standalone'`          | Required for install prompt on Chromium; makes installed PWA feel native |
| `start_url: '/'`                 | Prevents installing from `/chat/co_z...` (ephemeral chat ID)             |
| `background_color: '#f5f5f4'`    | Splash screen color matching app background                              |
| `globPatterns` with `html,wasm`  | Precaches app shell and Jazz WASM crypto module                          |
| `navigateFallback: 'index.html'` | **Critical** — enables offline SPA routing for `/chat/:chatId`           |
| `navigateFallbackAllowlist`      | Excludes internal debug routes from fallback                             |
| `cleanupOutdatedCaches: true`    | Removes stale caches from previous SW versions                           |

### Phase 2: Install Prompt Composable + Component

#### 2a. Create `src/composables/usePwaInstall.ts`

Captures the `beforeinstallprompt` event, detects iOS Safari, and detects standalone mode.

```typescript
// src/composables/usePwaInstall.ts
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstallable = ref(false)
const isInstalled = ref(false)
const isIOSSafari = ref(false)

export function usePwaInstall() {
  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    isInstallable.value = true
  }

  function handleAppInstalled() {
    deferredPrompt.value = null
    isInstallable.value = false
    isInstalled.value = true
  }

  async function install(): Promise<'accepted' | 'dismissed' | undefined> {
    if (!deferredPrompt.value) return undefined
    const result = await deferredPrompt.value.prompt()
    deferredPrompt.value = null
    isInstallable.value = false
    if (result.outcome === 'accepted') {
      isInstalled.value = true
    }
    return result.outcome
  }

  onMounted(() => {
    // Detect standalone mode (already installed)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      isInstalled.value = true
      return
    }

    // Detect iOS Safari (no beforeinstallprompt support)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
    isIOSSafari.value = isIOS && isSafari

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return { isInstallable, isInstalled, isIOSSafari, install }
}
```

**Dismissal strategy:** Store a timestamp in `localStorage` when the user dismisses. Don't re-show for 30 days.

#### 2b. Create `src/components/InstallPrompt.vue`

Fixed bottom banner. Shows install button on Android/Desktop, manual instructions on iOS Safari. Dismissible with 30-day cooldown.

```vue
<!-- src/components/InstallPrompt.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { BaseButton } from '@/components/ui/button'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 30

const { isInstallable, isInstalled, isIOSSafari, install } = usePwaInstall()
const isDismissed = ref(false)

onMounted(() => {
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (dismissed) {
    const elapsed = Date.now() - Number(dismissed)
    isDismissed.value = elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000
  }
})

function dismiss() {
  isDismissed.value = true
  localStorage.setItem(DISMISS_KEY, String(Date.now()))
}

async function handleInstall() {
  const outcome = await install()
  if (outcome === 'dismissed') dismiss()
}

const showPrompt = computed(
  () => !isInstalled.value && !isDismissed.value && (isInstallable.value || isIOSSafari.value),
)
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="showPrompt"
      role="alert"
      class="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-sm items-center gap-3
             rounded-lg border border-stone-200 bg-white p-4 shadow-lg
             dark:border-stone-700 dark:bg-stone-900"
    >
      <div class="flex-1">
        <p class="text-sm font-medium dark:text-white">Install JazzChat</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">
          {{
            isIOSSafari
              ? 'Tap Share then "Add to Home Screen"'
              : 'Get faster access and offline support'
          }}
        </p>
      </div>
      <BaseButton v-if="isInstallable" size="sm" @click="handleInstall">Install</BaseButton>
      <button
        type="button"
        class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        aria-label="Dismiss install prompt"
        @click="dismiss"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>
```

### Phase 3: Offline Status Indicator

#### 3a. Create `src/composables/useOnline.ts`

Uses `navigator.onLine` for basic connectivity detection. Debounces the "back online" transition by 1 second to prevent flapping.

```typescript
// src/composables/useOnline.ts
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isOnline = ref(true)

export function useOnline() {
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function goOffline() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
    isOnline.value = false
  }

  function goOnline() {
    // Debounce reconnection to avoid flapping
    reconnectTimer = setTimeout(() => {
      isOnline.value = true
    }, 1000)
  }

  onMounted(() => {
    isOnline.value = navigator.onLine
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('offline', goOffline)
    window.removeEventListener('online', goOnline)
    if (reconnectTimer) clearTimeout(reconnectTimer)
  })

  return { isOnline }
}
```

#### 3b. Create `src/components/NetworkStatus.vue`

Top-of-screen banner. Shows immediately when offline, auto-dismisses "Back online" after 3 seconds.

```vue
<!-- src/components/NetworkStatus.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOnline } from '@/composables/useOnline'

const { isOnline } = useOnline()
const showReconnected = ref(false)

watch(isOnline, (online, wasOnline) => {
  if (online && wasOnline === false) {
    showReconnected.value = true
    setTimeout(() => {
      showReconnected.value = false
    }, 3000)
  }
})
</script>

<template>
  <div
    v-if="!isOnline"
    role="status"
    aria-live="polite"
    class="fixed top-0 left-0 z-[100] w-full bg-amber-500 px-4 py-1.5
           text-center text-xs font-medium text-amber-950"
  >
    You're offline — messages will sync when you reconnect
  </div>
  <Transition name="fade">
    <div
      v-if="showReconnected"
      role="status"
      aria-live="polite"
      class="fixed top-0 left-0 z-[100] w-full bg-emerald-500 px-4 py-1.5
             text-center text-xs font-medium text-emerald-950"
    >
      Back online
    </div>
  </Transition>
</template>
```

### Phase 4: Mount New Components in App.vue

**File: `src/App.vue`**

Add `NetworkStatus` and `InstallPrompt` alongside existing `ReloadPrompt`:

```vue
<script setup lang="ts">
// ... existing imports ...
import NetworkStatus from './components/NetworkStatus.vue'
import InstallPrompt from './components/InstallPrompt.vue'
</script>

<template>
  <div class="flex h-screen w-screen flex-col bg-stone-100 dark:bg-stone-925 dark:text-white">
    <NetworkStatus />
    <!-- ... existing header and main ... -->
    <ReloadPrompt />
    <InstallPrompt />
  </div>
</template>
```

**Banner stacking strategy:**

- `NetworkStatus` — top of screen, `z-[100]`
- `ReloadPrompt` — bottom-right (existing), `z-50`
- `InstallPrompt` — bottom-center, `z-50`. Won't overlap `ReloadPrompt` because ReloadPrompt is positioned right and InstallPrompt is centered with `max-w-sm`.

## Acceptance Criteria

### Functional Requirements

- [ ] App shell loads on any route (`/`, `/chat/:id`) when completely offline (after first visit)
- [ ] Jazz data (messages, chats) available offline via IndexedDB (already works — verify)
- [ ] Custom install prompt appears on Android Chrome and Desktop Chrome/Edge after `beforeinstallprompt` fires
- [ ] iOS Safari shows manual "Add to Home Screen" instructions instead of install button
- [ ] Install prompt is dismissible with 30-day cooldown (localStorage)
- [ ] Install prompt hidden when app is already running in standalone mode
- [ ] Offline banner appears immediately when network drops
- [ ] "Back online" banner shows for 3 seconds when reconnected, then auto-dismisses
- [ ] Online/offline transitions debounced (1s) to prevent flapping
- [ ] All new components respect dark mode
- [ ] Existing ReloadPrompt continues working unchanged

### Non-Functional Requirements

- [ ] `role="status"` and `aria-live="polite"` on network status banners
- [ ] `aria-label` on dismiss button
- [ ] No layout shift when banners appear/disappear
- [ ] No regressions in existing unit/e2e tests

## Technical Considerations

### Jazz Offline Behavior

Jazz stores all CoValues (Messages, Chats) in IndexedDB via `cojson-storage-indexeddb`. The `BrowserWebSocketPeerWithReconnection` class handles reconnection with exponential backoff. When offline:

- Reading data works (from IndexedDB)
- Writing data works (to IndexedDB, syncs later)
- Account creation requires at least one initial online connection

Jazz exposes `addConnectionListener(callback)` and `connected()` on the context object (see `JazzAuthContext` type at `/Users/alexanderopalic/projects/opensource/jazz/packages/jazz-tools/src/tools/types.ts`). React has `useSyncConnectionStatus()` for this. A Vue equivalent could be built as a follow-up to show Jazz-specific sync status (more accurate than `navigator.onLine` for captive portals).

### WASM Caching

Jazz uses `WasmCrypto.create()` for cryptographic operations. The WASM file must be precached. Adding `wasm` to `globPatterns` ensures this. Verify after build that the WASM file appears in the precache manifest.

### Known Limitations

- **First visit requires network** — service worker installs on first visit, so the app cannot work offline until it has been visited once online.
- **`navigator.onLine` is imperfect** — it checks for a network interface, not actual server reachability. A captive portal will show "online" even though Jazz sync fails. A `useSyncConnectionStatus` composable using Jazz's `addConnectionListener` would solve this (follow-up).
- **iOS Chrome/Edge cannot install PWAs** — only Safari on iOS supports "Add to Home Screen." Other iOS browsers use WebKit but lack the menu option.
- **Image uploads offline** — `createImage()` writes to local Jazz storage, but image processing may behave differently offline. Needs testing.

## Files to Create/Modify

| File                               | Action                                       |
| ---------------------------------- | -------------------------------------------- |
| `vite.config.ts`                   | Modify — add manifest fields, workbox config |
| `src/composables/usePwaInstall.ts` | Create                                       |
| `src/composables/useOnline.ts`     | Create                                       |
| `src/components/InstallPrompt.vue` | Create                                       |
| `src/components/NetworkStatus.vue` | Create                                       |
| `src/App.vue`                      | Modify — import and mount new components     |

## Future Considerations

- **`useSyncConnectionStatus` composable** — Use Jazz's `addConnectionListener` for accurate sync status (mirrors React's existing hook). More reliable than `navigator.onLine`.
- **Pending message indicator** — Show clock/spinner on messages not yet synced. Jazz tracks unsynced CoValues in IndexedDB.
- **Push notifications** — Notify users of new messages when app is in background (iOS 16.4+ supports this).
- **macOS Safari "Add to Dock"** — Safari 17.2+ supports PWA installation via a different mechanism than `beforeinstallprompt`. Could add detection.

## References

### Internal References

- Current PWA config: `vite.config.ts:15-61`
- ReloadPrompt component: `src/components/ReloadPrompt.vue`
- Jazz provider setup: `src/RootApp.vue:36`
- App layout: `src/App.vue`
- Jazz WebSocket reconnection: `/Users/alexanderopalic/projects/opensource/jazz/packages/cojson-transport-ws/src/WebSocketPeerWithReconnection.ts`
- Jazz IndexedDB storage: `/Users/alexanderopalic/projects/opensource/jazz/packages/cojson-storage-indexeddb/src/idbNode.ts`
- Jazz Vue provider: `/Users/alexanderopalic/projects/opensource/jazz/packages/community-jazz-vue/src/provider.ts`
- Jazz context types: `/Users/alexanderopalic/projects/opensource/jazz/packages/jazz-tools/src/tools/types.ts`
- React `useSyncConnectionStatus`: `/Users/alexanderopalic/projects/opensource/jazz/packages/jazz-tools/src/react-core/hooks.ts:897`

### External References

- [vite-plugin-pwa docs](https://vite-pwa-org.netlify.app/)
- [web.dev PWA Install Prompt](https://web.dev/learn/pwa/installation-prompt)
- [PWA on iOS limitations](https://brainhub.eu/library/pwa-on-ios)
