import { expect, test } from '@playwright/test'

test('redirects from / to a chat page with a co_z ID', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
  expect(page.url()).toMatch(/\/chat\/co_z/)
})

test('each visit creates a unique chat ID', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
  const firstUrl = page.url()

  // Clear cached chat ID so index.vue creates a new one
  await page.evaluate(() => localStorage.removeItem('vue-jazz-last-chat-id'))

  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
  const secondUrl = page.url()

  expect(firstUrl).not.toBe(secondUrl)
})

test('shows loading skeleton on the chat page before data loads', async ({ page }) => {
  // Navigate directly to a non-existent chat ID so useCoState never resolves
  await page.goto('/chat/co_zNonExistentFakeChatId123456789')
  const skeleton = page.locator('[role="status"]')
  await expect(skeleton).toBeVisible({ timeout: 10_000 })
})
