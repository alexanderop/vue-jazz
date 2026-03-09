---
title: 'refactor: Implement Page Object Pattern for E2E Tests'
type: refactor
status: active
date: 2026-03-09
---

# ♻️ Implement Page Object Pattern for E2E Tests

## Overview

Introduce the Page Object Pattern across all Playwright E2E tests to eliminate duplicated locators, encapsulate page interactions, and make tests resilient to UI changes. Currently, 8 E2E test files use raw inline locators — the same selectors (e.g., `#chat-message-input`, `[role="log"]`, `[aria-label="Username"]`) are repeated across multiple files. A single UI change can break tests in 4+ places.

## Problem Statement

**Duplicated locators across E2E tests:**

| Locator                                         | Used in                                 |
| ----------------------------------------------- | --------------------------------------- |
| `page.locator('#chat-message-input')`           | messaging, profile, multi-user          |
| `page.locator('[role="log"]')`                  | navigation, messaging, multi-user, a11y |
| `page.locator('[aria-label="Username"]')`       | profile, multi-user                     |
| `page.getByRole('button', { name: 'Log out' })` | navigation, multi-user                  |
| `page.locator('[role="status"]')`               | navigation, chat-creation               |
| `page.locator('button', { hasText: /co_z/ })`   | clipboard                               |

**Additional problems:**

- CSS class locators (`.items-end`, `.items-start`) are fragile implementation details
- `[role="status"]` is ambiguous — shared by loading skeletons and `NetworkStatus.vue`
- Multi-user tests repeat 8-12 lines of context creation boilerplate per test
- No standardized waiting strategies — tests mix `waitForURL`, `waitForSelector`, `waitForTimeout`, and extended assertion timeouts

## Proposed Solution

### Page Object Hierarchy

```
test/e2e/pages/
├── ChatPage.ts          # Main page object — chat interactions
├── HeaderFragment.ts    # Header bar — username, chat ID, logout
└── fixtures.ts          # Custom Playwright fixtures (multi-user)
```

**Design decisions:**

1. **Hybrid API** — Page objects expose both action methods (`sendMessage(text)`) and locator accessors (`messageInput`) for assertion chaining. Action methods perform the interaction; locator accessors return `Locator` to preserve Playwright's auto-wait and retry semantics.

2. **Composition over inheritance** — `ChatPage` contains a `header` property of type `HeaderFragment`. `HeaderFragment` can also be used standalone for tests that only interact with the header (e.g., clipboard tests).

3. **No `HomePage`** — `index.vue` is a redirect-only page with no user interaction. Use a static factory `ChatPage.createFromHome(page)` instead.

4. **Built-in waiting** — `ChatPage.open(url)` waits for the chat log to be visible. `ChatPage.createFromHome(page)` waits for the redirect and chat load. This standardizes the wait strategy across all tests.

5. **Multi-user fixture** — A custom Playwright fixture encapsulates browser context creation, navigation, and cleanup for multi-user tests.

### `HeaderFragment.ts`

```typescript
// test/e2e/pages/HeaderFragment.ts
import type { Page, Locator } from '@playwright/test'

export class HeaderFragment {
  readonly usernameInput: Locator
  readonly chatIdButton: Locator
  readonly logoutButton: Locator

  constructor(private page: Page) {
    this.usernameInput = page.locator('[aria-label="Username"]')
    this.chatIdButton = page.locator('header button', { hasText: /co_z/ })
    this.logoutButton = page.getByRole('button', { name: 'Log out' })
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

  async logout() {
    await this.logoutButton.click()
  }
}
```

### `ChatPage.ts`

```typescript
// test/e2e/pages/ChatPage.ts
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
  static async createFromHome(page: Page, baseURL: string): Promise<ChatPage> {
    const chatPage = new ChatPage(page)
    await page.goto(baseURL)
    await page.waitForURL(/\/chat\/co_z/)
    await chatPage.chatLog.waitFor({ state: 'visible' })
    return chatPage
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text)
    await this.messageInput.press('Enter')
  }

  /** Get all visible message texts in the chat log */
  async getMessageTexts(): Promise<string[]> {
    const bubbles = this.chatLog.locator('[class*="rounded-2xl"] p')
    return await bubbles.allTextContents()
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

  async showMoreMessages() {
    await this.showMoreButton.click()
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url()
  }
}
```

### `fixtures.ts` — Multi-User Support

```typescript
// test/e2e/pages/fixtures.ts
import { test as base, type Browser, type BrowserContext } from '@playwright/test'
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

    // User A creates a chat
    const userA = await ChatPage.createFromHome(pageA, 'http://localhost:4173')
    const chatUrl = await userA.getCurrentUrl()

    // User B joins the same chat
    const userB = new ChatPage(pageB)
    await userB.open(chatUrl)

    await use({ userA, userB, contextA, contextB })

    await contextA.close()
    await contextB.close()
  },
})

export { expect } from '@playwright/test'
```

### Existing Test Utils

`test/e2e/test-utils.ts` helpers are handled as follows:

- `navigateToChat(page)` → replaced by `ChatPage.createFromHome(page, baseURL)`
- `waitForApp(page)` → kept in `test-utils.ts` (generic DOM readiness, not page-specific)
- `setDarkMode(page)` / `setLightMode(page)` → kept in `test-utils.ts` (environment concerns, not page concerns)

## Acceptance Criteria

- [ ] `test/e2e/pages/ChatPage.ts` created with locator accessors and action methods
- [ ] `test/e2e/pages/HeaderFragment.ts` created with username, chat ID, logout interactions
- [ ] `test/e2e/pages/fixtures.ts` created with multi-user custom fixture
- [ ] All 8 E2E test files migrated to use page objects — zero raw locator strings in test files
- [ ] `navigateToChat()` in `test-utils.ts` replaced by `ChatPage.createFromHome()`
- [ ] `waitForApp()`, `setDarkMode()`, `setLightMode()` remain in `test-utils.ts`
- [ ] All existing E2E tests pass after migration (`pnpm test:e2e`)
- [ ] No new test behavior — this is a pure refactor of test infrastructure

## Technical Considerations

### Locator Disambiguation

`[role="status"]` is used by both loading skeletons and `NetworkStatus.vue`. The page object scopes the skeleton locator to `main [role="status"]` to avoid collision. If this proves insufficient, consider adding `data-testid="chat-loading"` to the skeleton elements.

### CSS Class Locators

`.items-end` and `.items-start` are Tailwind CSS implementation details. They work today but are fragile. The page object centralizes them in `getOwnMessages()` / `getOtherMessages()`, so if the CSS changes, only the page object needs updating. A future improvement would be adding `data-testid="message-own"` / `data-testid="message-other"` to `ChatBubble.vue`.

### Future-Proofing

The page object exposes stubs for untested flows that exist in the UI:

- Image upload (`ChatInputForm.vue`) — `uploadImage()`, `getUploadError()` can be added when E2E tests are written
- Network status (`NetworkStatus.vue`) — A `NetworkStatusFragment` can be added later
- PWA prompts (`InstallPrompt.vue`, `ReloadPrompt.vue`) — A `PwaPromptFragment` can be added later

These are NOT implemented now — only the currently tested flows are modeled. This avoids designing abstractions for untested code.

## Implementation Phases

### Phase 1: Create Page Objects

- [ ] Create `test/e2e/pages/HeaderFragment.ts`
- [ ] Create `test/e2e/pages/ChatPage.ts`
- [ ] Create `test/e2e/pages/fixtures.ts` with multi-user fixture

### Phase 2: Migrate Tests (one file at a time, verify after each)

- [ ] `app.test.ts` — simplest, validates basic setup
- [ ] `navigation.test.ts` — uses `ChatPage` locators + skeleton
- [ ] `chat-creation.test.ts` — uses `ChatPage.createFromHome()`
- [ ] `messaging.test.ts` — core `sendMessage()` + `hasMessage()` usage
- [ ] `profile.test.ts` — `header.setUsername()` + `header.getUsername()`
- [ ] `clipboard.test.ts` — `header.copyChatId()` + `header.chatIdButton`
- [ ] `multi-user.test.ts` — custom fixture replaces boilerplate
- [ ] `a11y.test.ts` — uses `ChatPage` for navigation, keeps axe logic inline

### Phase 3: Cleanup

- [ ] Remove `navigateToChat()` from `test-utils.ts`
- [ ] Add barrel export `test/e2e/pages/index.ts`
- [ ] Run full E2E suite to verify: `pnpm test:e2e`

## References

### Internal

- E2E test directory: `test/e2e/`
- Existing test utils: `test/e2e/test-utils.ts`
- App shell (header): `src/App.vue:28-48`
- Chat page: `src/pages/chat/[chatId].vue`
- Home/redirect page: `src/pages/index.vue`
- Chat components: `src/components/chat/`
- Playwright config: `playwright.config.ts`

### External

- [Playwright Page Object Model docs](https://playwright.dev/docs/pom)
- [Playwright Custom Fixtures docs](https://playwright.dev/docs/test-fixtures)
