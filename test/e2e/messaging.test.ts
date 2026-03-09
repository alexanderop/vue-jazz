import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/chat\/co_z/)
})

test('shows empty state text when no messages', async ({ page }) => {
  await expect(page.getByText('Start a conversation below.')).toBeVisible()
})

test('sends a message and displays it', async ({ page }) => {
  const input = page.locator('#chat-message-input')
  await input.fill('Hello, world!')
  await input.press('Enter')

  const log = page.locator('[role="log"]')
  await expect(log.getByText('Hello, world!')).toBeVisible()
})

test('clears input after sending a message', async ({ page }) => {
  const input = page.locator('#chat-message-input')
  await input.fill('Test message')
  await input.press('Enter')

  await expect(input).toHaveValue('')
})

test('rejects whitespace-only messages', async ({ page }) => {
  const input = page.locator('#chat-message-input')
  await input.fill('   ')
  await input.press('Enter')

  await expect(page.getByText('Start a conversation below.')).toBeVisible()
  await expect(input).toHaveValue('   ')
})

test('own messages are right-aligned', async ({ page }) => {
  const input = page.locator('#chat-message-input')
  await input.fill('My message')
  await input.press('Enter')

  const log = page.locator('[role="log"]')
  await expect(log.getByText('My message')).toBeVisible()

  const bubble = log.locator('.items-end').first()
  await expect(bubble).toBeVisible()
})

test('Enter key submits the message', async ({ page }) => {
  const input = page.locator('#chat-message-input')
  await input.fill('Enter test')
  await input.press('Enter')

  const log = page.locator('[role="log"]')
  await expect(log.getByText('Enter test')).toBeVisible()
})
