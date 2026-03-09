import type { Page, Locator } from '@playwright/test'
import { HeaderFragment } from './HeaderFragment'

export class ChatPage {
  readonly header: HeaderFragment
  readonly messageInput: Locator
  readonly chatLog: Locator
  readonly loadingSkeleton: Locator
  readonly showMoreButton: Locator
  readonly emptyState: Locator

  constructor(private page: Page) {
    this.header = new HeaderFragment(page)
    this.messageInput = page.locator('#chat-message-input')
    this.chatLog = page.locator('[role="log"]')
    this.loadingSkeleton = page.locator('main [role="status"]')
    this.showMoreButton = page.getByRole('button', { name: 'Load older messages' })
    this.emptyState = page.getByText('Start a conversation below.')
  }

  /** Navigate to a specific chat URL and wait for the log to be visible */
  async open(url: string) {
    await this.page.goto(url)
    await this.chatLog.waitFor({ state: 'visible' })
  }

  /** Navigate to home, wait for redirect to a new chat */
  static async createFromHome(page: Page): Promise<ChatPage> {
    const chatPage = new ChatPage(page)
    await page.goto('/')
    await page.waitForURL(/\/chat\/co_z/)
    await chatPage.chatLog.waitFor({ state: 'visible' })
    return chatPage
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text)
    await this.messageInput.press('Enter')
  }

  /** Get own messages (right-aligned) */
  getOwnMessages(): Locator {
    return this.chatLog.locator('.items-end')
  }

  /** Get other users' messages (left-aligned) */
  getOtherMessages(): Locator {
    return this.chatLog.locator('.items-start')
  }

  hasMessage(text: string): Locator {
    return this.chatLog.getByText(text)
  }

  getCurrentUrl(): string {
    return this.page.url()
  }
}
