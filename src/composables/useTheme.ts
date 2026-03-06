import { ref, watchEffect, onScopeDispose } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'vite-ui-theme'

const stored = localStorage.getItem(STORAGE_KEY)
const isValidTheme = (v: string | null): v is Theme =>
  v === 'light' || v === 'dark' || v === 'system'
const theme = ref<Theme>(isValidTheme(stored) ? stored : 'system')

let initialized = false

function applyTheme() {
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  if (theme.value === 'system') {
    const systemTheme = globalThis.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme.value)
  }
}

export function useTheme() {
  if (!initialized) {
    initialized = true

    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme.value === 'system') {
        applyTheme()
      }
    }
    mediaQuery.addEventListener('change', handleChange)

    watchEffect(applyTheme)

    onScopeDispose(() => {
      mediaQuery.removeEventListener('change', handleChange)
      initialized = false
    })
  }

  function setTheme(value: Theme) {
    localStorage.setItem(STORAGE_KEY, value)
    theme.value = value
  }

  return { theme, setTheme }
}
