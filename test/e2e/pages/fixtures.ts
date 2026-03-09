import { test as base, type BrowserContext } from '@playwright/test'
import { ChatPage } from './ChatPage'

type MultiUserFixtures = {
  chatSession: {
    userA: ChatPage
    userB: ChatPage
    contextA: BrowserContext
    contextB: BrowserContext
  }
}

export const test = base.extend<MultiUserFixtures>({
  chatSession: async ({ browser }, use) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const userA = await ChatPage.createFromHome(pageA)
    const chatUrl = await userA.getCurrentUrl()

    const userB = new ChatPage(pageB)
    await userB.open(chatUrl)

    await use({ userA, userB, contextA, contextB })

    await contextA.close()
    await contextB.close()
  },
})

export { expect } from '@playwright/test'
