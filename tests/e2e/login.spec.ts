import { expect, test } from '@playwright/test'

// "/" is the public marketing landing page (no auth required) — a guest
// visiting a protected route is who actually gets bounced to login.
test('redirects guests away from a protected route', async ({ page }) => {
  await page.goto('/app/dashboard')

  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('heading', { name: 'Masuk ke workspace' })).toBeVisible()
})
