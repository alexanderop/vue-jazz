import { expect, test } from '@playwright/test'
import { ChatPage } from './pages'

let chat: ChatPage

test.beforeEach(async ({ page }) => {
  chat = await ChatPage.createFromHome(page)
})

test('shows empty state text when no messages', async () => {
  await expect(chat.emptyState).toBeVisible()
})

test('sends a message and displays it', async () => {
  await chat.sendMessage('Hello, world!')

  await expect(chat.hasMessage('Hello, world!')).toBeVisible()
})

test('clears input after sending a message', async () => {
  await chat.sendMessage('Test message')

  await expect(chat.messageInput).toHaveValue('')
})

test('rejects whitespace-only messages', async () => {
  await chat.messageInput.fill('   ')
  await chat.messageInput.press('Enter')

  await expect(chat.emptyState).toBeVisible()
  await expect(chat.messageInput).toHaveValue('   ')
})

test('own messages are right-aligned', async () => {
  await chat.sendMessage('My message')

  await expect(chat.hasMessage('My message')).toBeVisible()
  await expect(chat.getOwnMessages().first()).toBeVisible()
})

test('Enter key submits the message', async () => {
  await chat.sendMessage('Enter test')

  await expect(chat.hasMessage('Enter test')).toBeVisible()
})
