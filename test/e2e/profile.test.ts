import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
})

test('has a random username on load', async ({ page }) => {
  const usernameInput = page.locator('[aria-label="Username"]')
  await expect(usernameInput).toBeVisible()
  const username = await usernameInput.inputValue()
  expect(username.length).toBeGreaterThan(0)
})

test('can edit username inline', async ({ page }) => {
  const usernameInput = page.locator('[aria-label="Username"]')
  await expect(usernameInput).toBeVisible()

  await usernameInput.fill('TestUser123')
  await expect(usernameInput).toHaveValue('TestUser123')

  // Reload and verify persistence
  await page.reload()
  await expect(page.locator('[aria-label="Username"]')).toHaveValue('TestUser123')
})

test('edited username appears on sent messages', async ({ page }) => {
  const usernameInput = page.locator('[aria-label="Username"]')
  await usernameInput.fill('ChatTester')

  const input = page.locator('#chat-message-input')
  await input.fill('Hello with custom name')
  await input.press('Enter')

  const log = page.locator('[role="log"]')
  await expect(log.getByText('Hello with custom name')).toBeVisible()
  await expect(log.getByText('ChatTester')).toBeVisible()
})
