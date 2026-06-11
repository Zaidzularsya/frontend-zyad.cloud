import { expect, test } from '@playwright/test'

test('redirects guests to login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('heading', { name: 'Masuk ke workspace' })).toBeVisible()
})
