import type { Page, Locator } from '@playwright/test'

export class HeaderFragment {
  readonly usernameInput: Locator
  readonly chatIdButton: Locator

  constructor(private page: Page) {
    this.usernameInput = page.locator('[aria-label="Username"]')
    this.chatIdButton = page.locator('header button', { hasText: /co_z/ })
  }

  async setUsername(name: string) {
    await this.usernameInput.fill(name)
    await this.usernameInput.press('Tab')
  }

  async getUsername(): Promise<string> {
    return await this.usernameInput.inputValue()
  }

  async copyChatId() {
    await this.chatIdButton.click()
  }
}
