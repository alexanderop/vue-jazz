import { expect, test } from '@playwright/test'

test('app loads without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await expect(page).toHaveTitle(/Vue Jazz/)

  expect(errors).toHaveLength(0)
})
