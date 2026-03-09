import { shouldShowInstallPrompt, isDismissed, isIosSafari } from '@/composables/usePwaInstall'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, val: string) => storage.set(key, val),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
  configurable: true,
})

function setUA(ua: string) {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true,
  })
}

describe(shouldShowInstallPrompt, () => {
  it('shows when canInstall and not installed or dismissed', () => {
    expect(
      shouldShowInstallPrompt({
        canInstall: true,
        isIos: false,
        installed: false,
        dismissed: false,
      }),
    ).toBeTruthy()
  })

  it('shows when iOS and not installed or dismissed', () => {
    expect(
      shouldShowInstallPrompt({
        canInstall: false,
        isIos: true,
        installed: false,
        dismissed: false,
      }),
    ).toBeTruthy()
  })

  it('hides when already installed', () => {
    expect(
      shouldShowInstallPrompt({
        canInstall: true,
        isIos: false,
        installed: true,
        dismissed: false,
      }),
    ).toBeFalsy()
  })

  it('hides when dismissed', () => {
    expect(
      shouldShowInstallPrompt({
        canInstall: true,
        isIos: false,
        installed: false,
        dismissed: true,
      }),
    ).toBeFalsy()
  })

  it('hides when neither canInstall nor iOS', () => {
    expect(
      shouldShowInstallPrompt({
        canInstall: false,
        isIos: false,
        installed: false,
        dismissed: false,
      }),
    ).toBeFalsy()
  })

  it('hides when both installed and dismissed', () => {
    expect(
      shouldShowInstallPrompt({ canInstall: true, isIos: true, installed: true, dismissed: true }),
    ).toBeFalsy()
  })
})

describe(isDismissed, () => {
  it('returns false when no dismissal stored', () => {
    localStorage.clear()
    expect(isDismissed()).toBeFalsy()
  })

  it('returns true when dismissed recently', () => {
    localStorage.clear()
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
    expect(isDismissed()).toBeTruthy()
  })

  it('returns false when dismissed more than 30 days ago', () => {
    localStorage.clear()
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    localStorage.setItem('pwa-install-dismissed', String(thirtyOneDaysAgo))
    expect(isDismissed()).toBeFalsy()
  })
})

describe(isIosSafari, () => {
  const originalUA = globalThis.navigator.userAgent

  it('returns true for iPhone Safari', () => {
    setUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    )
    expect(isIosSafari()).toBeTruthy()
    setUA(originalUA)
  })

  it('returns false for Chrome on iOS', () => {
    setUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1',
    )
    expect(isIosSafari()).toBeFalsy()
    setUA(originalUA)
  })

  it('returns false for desktop Chrome', () => {
    setUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    )
    expect(isIosSafari()).toBeFalsy()
    setUA(originalUA)
  })
})
