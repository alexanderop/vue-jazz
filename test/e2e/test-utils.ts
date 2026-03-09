import type { Page } from '@playwright/test'

export async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded')
}

export async function setDarkMode(page: Page) {
  await page.emulateMedia({ colorScheme: 'dark' })
}

export async function setLightMode(page: Page) {
  await page.emulateMedia({ colorScheme: 'light' })
}
