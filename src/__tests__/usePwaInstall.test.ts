import { shouldShowInstallPrompt, isDismissed, isIosSafari } from '../composables/usePwaInstall'

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
  // eslint-disable-next-line jest/no-hooks -- cleanup is necessary
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false when no dismissal stored', () => {
    expect(isDismissed()).toBeFalsy()
  })

  it('returns true when dismissed recently', () => {
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
    expect(isDismissed()).toBeTruthy()
  })

  it('returns false when dismissed more than 30 days ago', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    localStorage.setItem('pwa-install-dismissed', String(thirtyOneDaysAgo))
    expect(isDismissed()).toBeFalsy()
  })
})

describe(isIosSafari, () => {
  const originalUA = globalThis.navigator.userAgent

  // eslint-disable-next-line jest/no-hooks -- cleanup is necessary
  afterEach(() => {
    setUA(originalUA)
  })

  it('returns true for iPhone Safari', () => {
    setUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    )
    expect(isIosSafari()).toBeTruthy()
  })

  it('returns false for Chrome on iOS', () => {
    setUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1',
    )
    expect(isIosSafari()).toBeFalsy()
  })

  it('returns false for desktop Chrome', () => {
    setUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    )
    expect(isIosSafari()).toBeFalsy()
  })
})
