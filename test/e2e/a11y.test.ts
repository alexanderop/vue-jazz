import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ChatPage } from './pages'
import { setDarkMode, setLightMode } from './test-utils'

test.describe('Accessibility', () => {
  test('chat view has no critical a11y violations (light mode)', async ({ page }) => {
    await setLightMode(page)
    await ChatPage.createFromHome(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations.filter((v) => v.impact === 'critical')).toEqual([])
  })

  test('chat view has no critical a11y violations (dark mode)', async ({ page }) => {
    await setDarkMode(page)
    await ChatPage.createFromHome(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations.filter((v) => v.impact === 'critical')).toEqual([])
  })

  test('empty chat state has no critical a11y violations', async ({ page }) => {
    await ChatPage.createFromHome(page)

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()

    expect(results.violations.filter((v) => v.impact === 'critical')).toEqual([])
  })

  test('page has skip-to-content link', async ({ page }) => {
    await ChatPage.createFromHome(page)
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()
  })

  test('chat log has proper ARIA attributes', async ({ page }) => {
    const chat = await ChatPage.createFromHome(page)
    await expect(chat.chatLog).toBeVisible()
    await expect(chat.chatLog).toHaveAttribute('aria-live', 'polite')
  })

  test('message input has accessible label', async ({ page }) => {
    await ChatPage.createFromHome(page)
    const label = page.locator('label[for="chat-message-input"]')
    await expect(label).toBeAttached()
  })
})
