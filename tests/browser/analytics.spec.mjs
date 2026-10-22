import { test, expect } from '@playwright/test';

const sdkUrl = 'https://eu-assets.i.posthog.com/static/module.js';

test('automated browsers do not load analytics', async ({ page }) => {
  const requests = [];
  await page.route('https://**.posthog.com/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  await page.locator('[data-action="start-lesson"]').click();
  await page.evaluate(async () => (await import('./analytics.js')).analyticsReady());
  expect(requests).toEqual([]);
});

test('analytics follows the profile switch and persists opt-out', async ({ page }) => {
  // Exercise the real UI and analytics module, but never send test events to PostHog.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.analyticsEvents = [];
  });
  let sdkLoads = 0;
  await page.route('https://**.posthog.com/**', (route) => route.abort());
  await page.route(sdkUrl, (route) => {
    sdkLoads++;
    return route.fulfill({
      contentType: 'text/javascript',
      body: `export default {
        init(_key, config) { this.config = config; },
        capture(event, properties) {
          if (this.config.before_send({ event, properties })) {
            window.analyticsEvents.push({ event, properties });
          }
        }
      };`,
    });
  });
  await page.goto('/');
  await page.locator('[data-action="start-lesson"]').click();
  await expect
    .poll(() => page.evaluate(() => window.analyticsEvents.map((e) => e.event)))
    .toContain('lesson_started');
  await page.locator('#open-profile').click();
  await page.locator('#profile-analytics').uncheck();
  const eventCount = await page.evaluate(() => window.analyticsEvents.length);
  await page.locator('#close-dialog').click();
  await page.getByRole('button', { name: 'Обучение', exact: true }).click();
  await page.locator('[data-action="start-lesson"]').click();
  expect(await page.evaluate(() => window.analyticsEvents.length)).toBe(eventCount);
  await page.reload();
  await page.evaluate(async () => (await import('./analytics.js')).analyticsReady());
  expect(sdkLoads).toBe(1);
  await page.locator('#open-profile').click();
  await expect(page.locator('#profile-analytics')).not.toBeChecked();
  await page.locator('#profile-analytics').check();
  await expect
    .poll(() => page.evaluate(() => window.analyticsEvents.map((e) => e.event)))
    .toContain('settings_changed');
  expect(sdkLoads).toBe(2);
});
