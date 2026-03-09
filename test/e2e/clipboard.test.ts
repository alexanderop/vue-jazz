import { expect, test } from '@playwright/test'
import { ChatPage } from './pages'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

let chat: ChatPage

test.beforeEach(async ({ page }) => {
  chat = await ChatPage.createFromHome(page)
})

test('displays truncated chat ID', async () => {
  await expect(chat.header.chatIdButton).toBeVisible()
})

test('copies chat ID to clipboard and shows Copied!', async ({ page }) => {
  await chat.header.copyChatId()

  await expect(page.getByText('Copied!')).toBeVisible()
})

test('reverts from Copied! after 1500ms', async ({ page }) => {
  await chat.header.copyChatId()

  await expect(page.getByText('Copied!')).toBeVisible()
  await expect(chat.header.chatIdButton).toBeVisible({ timeout: 5000 })
})
