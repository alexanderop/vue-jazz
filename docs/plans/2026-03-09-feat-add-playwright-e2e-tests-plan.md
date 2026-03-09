---
title: 'feat: Add Playwright E2E Tests for Core Flows'
type: feat
status: active
date: 2026-03-09
---

# Add Playwright E2E Tests for Core Flows

## Overview

Expand the existing Playwright E2E test suite from a single smoke test to comprehensive coverage of the app's core user flows. Tests run against the real Jazz sync engine (`wss://cloud.jazz.tools`) — no mocking.

## Current State

- Playwright v1.58.2 already installed and configured (`playwright.config.ts`)
- One smoke test exists at `test/e2e/app.test.ts` (verifies app loads, title matches)
- CI already runs E2E via `.github/workflows/ci.yml`
- Scripts: `pnpm test:e2e` and `pnpm test:e2e:ui`

## Proposed Test Structure

```
test/e2e/
  app.test.ts          # Existing smoke test (keep as-is)
  chat-creation.test.ts # Chat creation + redirect flow
  messaging.test.ts     # Sending messages, empty state, input validation
  multi-user.test.ts    # Two browser contexts sharing a chat
  profile.test.ts       # Username editing
  clipboard.test.ts     # Chat ID copy-to-clipboard
  navigation.test.ts    # Routing edge cases
```

## Test Specifications

### 1. Chat Creation & Redirect (`chat-creation.test.ts`)

| Test                                    | Description                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| redirects from `/` to `/chat/[chatId]`  | Navigate to `/`, wait for URL to match `/chat/co_z...`, verify chat page loads        |
| creates a new chat on each visit to `/` | Visit `/` twice, verify different chat IDs in the URL                                 |
| shows loading skeleton before redirect  | Navigate to `/`, assert `role="status"` skeleton is visible before redirect completes |

**Key selectors:**

- Loading skeleton: `[role="status"]`
- URL pattern: `/chat/co_z` prefix (Jazz CoValue IDs)

### 2. Messaging (`messaging.test.ts`)

| Test                                 | Description                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| shows empty state for new chat       | Verify "Start a conversation below." text is visible in a fresh chat                 |
| sends a text message and displays it | Type in `#chat-message-input`, press Enter, verify message appears in `[role="log"]` |
| clears input after sending           | Send a message, verify input value is empty                                          |
| rejects whitespace-only messages     | Type spaces, press Enter, verify no message appears and input retains value          |
| displays own messages on the right   | Send a message, verify the bubble container has `items-end` class                    |
| submits on Enter key press           | Focus input, type message, press Enter (no submit button — form submit only)         |

**Key selectors:**

- Message input: `#chat-message-input`
- Message list: `[role="log"]`
- Empty state text: text content "Start a conversation below."

### 3. Multi-User Real-Time Sync (`multi-user.test.ts`)

| Test                                     | Description                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| second user sees first user's message    | User A creates chat, sends message; User B opens same URL, sees the message in `[role="log"]` |
| both users see each other's messages     | User A sends, User B sends, both see both messages                                            |
| other user's messages appear on the left | User B sees User A's message with `items-start` class (left-aligned, blue)                    |
| username shows on other user's bubble    | User B sees User A's name in `BubbleInfo` above the message bubble                            |

**Implementation pattern:**

```typescript
// Create two isolated browser contexts (each gets a separate Jazz anonymous account)
const contextA = await browser.newContext()
const contextB = await browser.newContext()
const pageA = await contextA.newPage()
const pageB = await contextB.newPage()

// User A creates the chat
await pageA.goto('/')
await pageA.waitForURL(/\/chat\/co_z/)
const chatUrl = pageA.url()

// User B joins the same chat
await pageB.goto(chatUrl)

// Use generous timeout for Jazz cross-user sync
await expect(pageB.locator('[role="log"]')).toContainText('Hello', { timeout: 10_000 })
```

**Important:** Jazz sync across users goes through `wss://cloud.jazz.tools`. Use `{ timeout: 10_000 }` for cross-user assertions to account for network latency.

### 4. Profile Editing (`profile.test.ts`)

| Test                               | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- | ---- | ---- | ------------- |
| displays a random username on load | Verify header input matches `Anonymous (Luffy                         | Zoro | Nami | ...)` pattern |
| edits username inline              | Clear input, type new name, verify the input value updates            |
| username appears on sent messages  | Edit username, send a message, verify `BubbleInfo` shows the new name |

**Key selectors:**

- Username input: `input[aria-label="Username"]`

### 5. Clipboard (`clipboard.test.ts`)

| Test                               | Description                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| copies chat ID to clipboard        | Grant clipboard permissions, click chat ID button, verify button text changes to "Copied!" |
| "Copied!" text reverts after delay | After copy, wait ~1.5s, verify button text reverts to truncated ID                         |
| chat ID button shows truncated ID  | Verify button text matches `co_z...` pattern with `…` suffix                               |

**Setup required:**

```typescript
// Grant clipboard permissions per context
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
})
```

### 6. Navigation Edge Cases (`navigation.test.ts`)

| Test                                      | Description                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| invalid chat ID shows loading state       | Navigate to `/chat/invalid-id`, verify loading skeleton persists (no crash) |
| direct navigation to valid chat URL works | Create chat via `/`, copy URL, open in new context, verify chat loads       |
| log out button is clickable               | Verify "Log out" button exists and is visible in the header                 |

## Playwright Config Updates

Update `playwright.config.ts` to add action/navigation timeouts for Jazz sync reliability:

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: 'test/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000, // Jazz sync can be slow
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
```

## Acceptance Criteria

- [ ] All 6 test files created with the tests listed above
- [ ] All tests pass locally via `pnpm test:e2e`
- [ ] All tests pass in CI (GitHub Actions)
- [ ] Multi-user tests use separate browser contexts with generous sync timeouts
- [ ] Clipboard tests grant appropriate permissions
- [ ] No test relies on mocking Jazz — all tests use real sync
- [ ] Playwright config updated with `expect.timeout` and `actionTimeout`
- [ ] Existing smoke test in `app.test.ts` remains unchanged

## Technical Considerations

### Jazz Sync Dependency

Tests require internet access to reach `wss://cloud.jazz.tools`. In CI, this means:

- The GitHub Actions runner needs outbound WebSocket access (default: yes)
- Multi-user sync assertions need generous timeouts (10s)
- 2 retries on CI (already configured) help with transient sync failures

### Anonymous Auth

Each `browser.newContext()` creates a fresh Jazz anonymous account. This is perfect for multi-user tests — no auth setup needed. Each context gets a random One Piece character name.

### Known Limitations

- **Invalid chat ID:** The app shows a loading skeleton forever with no error state. The navigation test should assert this current behavior and flag it as a UX improvement.
- **No pagination test:** Testing "Show more" requires 30+ messages. This could be added later with a helper that seeds messages via Jazz APIs, but it's out of scope for core flows.
- **No image upload tests:** Image upload is a distinct feature. Can be added as a follow-up test file (`image-upload.test.ts`).

## References

- Existing test: `test/e2e/app.test.ts`
- Playwright config: `playwright.config.ts`
- CI workflow: `.github/workflows/ci.yml`
- Chat page: `src/pages/chat/[chatId].vue`
- Chat composable: `src/composables/useChat.ts`
- Profile composable: `src/composables/useProfileEditor.ts`
- Clipboard composable: `src/composables/useChatIdClipboard.ts`
- Jazz schema: `src/schema.ts`
- App shell: `src/App.vue`
