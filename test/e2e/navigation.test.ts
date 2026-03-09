import { expect, test } from '@playwright/test'
import { ChatPage } from './pages'

test('invalid chat ID shows persistent loading', async ({ page }) => {
  const chat = new ChatPage(page)
  await page.goto('/chat/co_zinvalid123')

  await expect(chat.loadingSkeleton).toBeVisible()

  await page.waitForTimeout(500)
  await expect(chat.loadingSkeleton).toBeVisible()
})

test('direct URL navigation to a valid chat works', async ({ page }) => {
  const chat = await ChatPage.createFromHome(page)
  const chatUrl = await chat.getCurrentUrl()

  await chat.open(chatUrl)

  await expect(chat.chatLog).toBeVisible()
})

test('logout button is visible', async ({ page }) => {
  const chat = await ChatPage.createFromHome(page)

  await expect(chat.header.logoutButton).toBeVisible()
})
