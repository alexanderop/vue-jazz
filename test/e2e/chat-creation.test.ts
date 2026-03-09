import { expect, test } from '@playwright/test'
import { ChatPage } from './pages'

test('redirects from / to a chat page with a co_z ID', async ({ page }) => {
  const chat = await ChatPage.createFromHome(page)
  expect(await chat.getCurrentUrl()).toMatch(/\/chat\/co_z/)
})

test('each visit creates a unique chat ID', async ({ page }) => {
  const chat = await ChatPage.createFromHome(page)
  const firstUrl = await chat.getCurrentUrl()

  await page.evaluate(() => localStorage.removeItem('vue-jazz-last-chat-id'))

  const chat2 = await ChatPage.createFromHome(page)
  const secondUrl = await chat2.getCurrentUrl()

  expect(firstUrl).not.toBe(secondUrl)
})

test('shows loading skeleton on the chat page before data loads', async ({ page }) => {
  const chat = new ChatPage(page)
  await page.goto('/chat/co_zNonExistentFakeChatId123456789')
  await expect(chat.loadingSkeleton).toBeVisible({ timeout: 10_000 })
})
