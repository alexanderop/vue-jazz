import { ref, computed } from 'vue'
import { useEventListener, useMediaQuery } from '@vueuse/core'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 30

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deferredPrompt = ref<any>(null)
const isStandalone = useMediaQuery('(display-mode: standalone)')
const isInstalled = ref(
  isStandalone.value ||
    ('standalone' in globalThis.navigator && Boolean(globalThis.navigator.standalone)),
)

export function isIosSafari(): boolean {
  const ua = globalThis.navigator.userAgent
  return /iP(?:hone|od|ad)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
}

export function isDismissed(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const dismissedAt = Number(dismissed)
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return daysSince < DISMISS_DAYS
}

export function shouldShowInstallPrompt(opts: {
  canInstall: boolean
  isIos: boolean
  installed: boolean
  dismissed: boolean
}): boolean {
  return (opts.canInstall || opts.isIos) && !opts.installed && !opts.dismissed
}

useEventListener(globalThis, 'beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt.value = e
})

useEventListener(globalThis, 'appinstalled', () => {
  isInstalled.value = true
  deferredPrompt.value = null
})

export function usePwaInstall() {
  const dismissed = ref(isDismissed())
  const canInstall = computed(() => deferredPrompt.value !== null)
  const showIosPrompt = computed(() => isIosSafari() && !isInstalled.value && !dismissed.value)
  const showInstallPrompt = computed(() =>
    shouldShowInstallPrompt({
      canInstall: canInstall.value,
      isIos: showIosPrompt.value,
      installed: isInstalled.value,
      dismissed: dismissed.value,
    }),
  )

  async function install() {
    const prompt = deferredPrompt.value
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      deferredPrompt.value = null
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    dismissed.value = true
    deferredPrompt.value = null
  }

  return { canInstall, showIosPrompt, showInstallPrompt, isInstalled, install, dismiss }
}
