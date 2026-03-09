import { expect, test } from '@playwright/test'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
})

test('displays truncated chat ID', async ({ page }) => {
  const chatIdButton = page.locator('button', { hasText: /co_z.*…/ })
  await expect(chatIdButton).toBeVisible()
})

test('copies chat ID to clipboard and shows Copied!', async ({ page }) => {
  const chatIdButton = page.locator('button', { hasText: /co_z.*…/ })
  await chatIdButton.click()

  await expect(page.getByText('Copied!')).toBeVisible()
})

test('reverts from Copied! after 1500ms', async ({ page }) => {
  const chatIdButton = page.locator('button', { hasText: /co_z.*…/ })
  await chatIdButton.click()

  await expect(page.getByText('Copied!')).toBeVisible()
  await expect(page.locator('button', { hasText: /co_z.*…/ })).toBeVisible({ timeout: 5000 })
})
