import { test, expect } from './pages'

test("User B sees User A's message", async ({ chatSession }) => {
  const { userA, userB } = chatSession

  await userA.sendMessage('Hello from User A')
  await expect(userA.hasMessage('Hello from User A')).toBeVisible()

  await expect(userB.hasMessage('Hello from User A')).toBeVisible({ timeout: 10_000 })
})

test("both users see each other's messages", async ({ chatSession }) => {
  const { userA, userB } = chatSession

  await userA.sendMessage('Message from A')
  await expect(userB.hasMessage('Message from A')).toBeVisible({ timeout: 10_000 })

  await userB.sendMessage('Message from B')
  await expect(userA.hasMessage('Message from B')).toBeVisible({ timeout: 10_000 })
})

test("other user's messages are left-aligned", async ({ chatSession }) => {
  const { userA, userB } = chatSession

  await userA.sendMessage('Alignment test')
  await expect(userA.hasMessage('Alignment test')).toBeVisible()

  await expect(userB.hasMessage('Alignment test')).toBeVisible({ timeout: 10_000 })
  await expect(userB.getOtherMessages().first()).toBeVisible()
})

test("username shows on other user's message bubble", async ({ chatSession }) => {
  const { userA, userB } = chatSession

  const usernameA = await userA.header.getUsername()

  await userA.sendMessage('Name check')
  await expect(userA.hasMessage('Name check')).toBeVisible()

  await expect(userB.hasMessage('Name check')).toBeVisible({ timeout: 10_000 })
  await expect(userB.chatLog.getByText(usernameA)).toBeVisible({ timeout: 10_000 })
})
