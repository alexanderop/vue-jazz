import { expect, test } from '@playwright/test'

test("User B sees User A's message", async ({ browser }) => {
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()

  await pageA.goto('/')
  await pageA.waitForURL(/\/chat\/co_z/)
  const chatUrl = pageA.url()

  const inputA = pageA.locator('#chat-message-input')
  await inputA.fill('Hello from User A')
  await inputA.press('Enter')

  const logA = pageA.locator('[role="log"]')
  await expect(logA.getByText('Hello from User A')).toBeVisible()

  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(chatUrl)

  const logB = pageB.locator('[role="log"]')
  await expect(logB.getByText('Hello from User A')).toBeVisible({ timeout: 10_000 })

  await contextA.close()
  await contextB.close()
})

test("both users see each other's messages", async ({ browser }) => {
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()

  await pageA.goto('/')
  await pageA.waitForURL(/\/chat\/co_z/)
  const chatUrl = pageA.url()

  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(chatUrl)
  await pageB.waitForSelector('[role="log"]')

  const inputA = pageA.locator('#chat-message-input')
  await inputA.fill('Message from A')
  await inputA.press('Enter')

  const logB = pageB.locator('[role="log"]')
  await expect(logB.getByText('Message from A')).toBeVisible({ timeout: 10_000 })

  const inputB = pageB.locator('#chat-message-input')
  await inputB.fill('Message from B')
  await inputB.press('Enter')

  const logA = pageA.locator('[role="log"]')
  await expect(logA.getByText('Message from B')).toBeVisible({ timeout: 10_000 })

  await contextA.close()
  await contextB.close()
})

test("other user's messages are left-aligned", async ({ browser }) => {
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()

  await pageA.goto('/')
  await pageA.waitForURL(/\/chat\/co_z/)
  const chatUrl = pageA.url()

  const inputA = pageA.locator('#chat-message-input')
  await inputA.fill('Alignment test')
  await inputA.press('Enter')

  const logA = pageA.locator('[role="log"]')
  await expect(logA.getByText('Alignment test')).toBeVisible()

  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(chatUrl)

  const logB = pageB.locator('[role="log"]')
  await expect(logB.getByText('Alignment test')).toBeVisible({ timeout: 10_000 })

  const bubble = logB.locator('.items-start').first()
  await expect(bubble).toBeVisible()

  await contextA.close()
  await contextB.close()
})

test("username shows on other user's message bubble", async ({ browser }) => {
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()

  await pageA.goto('/')
  await pageA.waitForURL(/\/chat\/co_z/)
  const chatUrl = pageA.url()

  const usernameA = await pageA.locator('[aria-label="Username"]').inputValue()

  const inputA = pageA.locator('#chat-message-input')
  await inputA.fill('Name check')
  await inputA.press('Enter')

  const logA = pageA.locator('[role="log"]')
  await expect(logA.getByText('Name check')).toBeVisible()

  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(chatUrl)

  const logB = pageB.locator('[role="log"]')
  await expect(logB.getByText('Name check')).toBeVisible({ timeout: 10_000 })
  await expect(logB.getByText(usernameA)).toBeVisible({ timeout: 10_000 })

  await contextA.close()
  await contextB.close()
})
