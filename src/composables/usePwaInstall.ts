import { ref, computed } from 'vue'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 30

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deferredPrompt = ref<any>(null)
const isInstalled = ref(isStandalone())

function isStandalone(): boolean {
  return (
    globalThis.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in globalThis.navigator && Boolean(globalThis.navigator.standalone))
  )
}

function isIosSafari(): boolean {
  const ua = globalThis.navigator.userAgent
  return /iP(?:hone|od|ad)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
}

function isDismissed(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const dismissedAt = Number(dismissed)
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return daysSince < DISMISS_DAYS
}

globalThis.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt.value = e
})

globalThis.addEventListener('appinstalled', () => {
  isInstalled.value = true
  deferredPrompt.value = null
})

export function usePwaInstall() {
  const canInstall = computed(() => deferredPrompt.value !== null)
  const showIosPrompt = computed(() => isIosSafari() && !isInstalled.value && !isDismissed())
  const showInstallPrompt = computed(
    () => (canInstall.value || showIosPrompt.value) && !isInstalled.value && !isDismissed(),
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
    deferredPrompt.value = null
  }

  return { canInstall, showIosPrompt, showInstallPrompt, isInstalled, install, dismiss }
}
