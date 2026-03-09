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

  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
  const secondUrl = page.url()

  expect(firstUrl).not.toBe(secondUrl)
})

test('shows loading skeleton on the chat page before data loads', async ({ page }) => {
  // Block Jazz sync so the chat data never resolves, keeping the skeleton visible
  await page.route('**/cloud.jazz.tools/**', (route) => route.abort())
  await page.goto('/')
  // The index page creates a chat and redirects — the chat page shows a skeleton
  // while waiting for data to load (which never resolves since sync is blocked)
  const skeleton = page.locator('[role="status"]')
  await expect(skeleton).toBeVisible({ timeout: 10_000 })
})
