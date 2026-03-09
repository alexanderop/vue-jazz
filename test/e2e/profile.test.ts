import { expect, test } from '@playwright/test'
import { ChatPage } from './pages'

let chat: ChatPage

test.beforeEach(async ({ page }) => {
  chat = await ChatPage.createFromHome(page)
})

test('has a random username on load', async () => {
  await expect(chat.header.usernameInput).toBeVisible()
  const username = await chat.header.getUsername()
  expect(username.length).toBeGreaterThan(0)
})

test('can edit username inline', async ({ page }) => {
  await expect(chat.header.usernameInput).toBeVisible()

  await chat.header.setUsername('TestUser123')
  await expect(chat.header.usernameInput).toHaveValue('TestUser123')

  await page.reload()
  const reloaded = new ChatPage(page)
  await expect(reloaded.header.usernameInput).toHaveValue('TestUser123')
})

test('edited username appears on sent messages', async () => {
  await chat.header.usernameInput.fill('ChatTester')

  await chat.sendMessage('Hello with custom name')

  await expect(chat.hasMessage('Hello with custom name')).toBeVisible()
  await expect(chat.chatLog.getByText('ChatTester')).toBeVisible()
})
