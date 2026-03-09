import { expect, test } from '@playwright/test'

test('invalid chat ID shows persistent loading', async ({ page }) => {
  await page.goto('/chat/co_zinvalid123')

  const loading = page.locator('[role="status"]')
  await expect(loading).toBeVisible()

  // Should still be loading after a delay (invalid ID never resolves)
  await page.waitForTimeout(2000)
  await expect(loading).toBeVisible()
})

test('direct URL navigation to a valid chat works', async ({ page }) => {
  // First create a chat to get a valid URL
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
  const chatUrl = page.url()

  // Navigate away and back
  await page.goto('about:blank')
  await page.goto(chatUrl)

  await expect(page.locator('[role="log"]')).toBeVisible()
})

test('logout button is visible', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)

  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
})
