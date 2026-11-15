import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// playwright.config.ts starts the dev server with VITE_CLERK_PUBLISHABLE_KEY
// empty, so these tests cover the app's behavior when Clerk isn't configured.
// Real sign-in and onboarding need a Clerk application: see docs/test-cases.md.

test('SP1-1: without a Clerk key the app explains the setup instead of crashing', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Almost ready' }),
  ).toBeVisible()
  await expect(page.getByText('VITE_CLERK_PUBLISHABLE_KEY')).toBeVisible()
  // The old public demo login is gone: nothing here should let anyone in.
  await expect(
    page.getByRole('button', { name: 'Take a look around' }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('SP1-5: setup screen fits the viewport and meets automated WCAG AA checks', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Almost ready' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(result.violations.map((violation) => violation.id)).toEqual([])
})
