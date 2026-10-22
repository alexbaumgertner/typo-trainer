import { test, expect } from '@playwright/test';

for (const language of ['ru', 'en']) {
  test(`@smoke built app loads and navigates in ${language}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('/');
    await expect(page).toHaveTitle(/Ритм/);
    await page.getByLabel('Язык обучения').selectOption(language);
    await expect(page.locator('[data-lesson]')).toHaveCount(16);
    await page.getByRole('button', { name: 'Практика', exact: true }).click();
    await expect(page.getByLabel('Ваш текст')).toBeVisible();
    await expect(page.locator('.keyboard')).toBeVisible();
    await page.getByRole('button', { name: 'Мой прогресс', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Ваш ритм становится увереннее',
    );
    await page
      .locator('header')
      .getByRole('button', { name: 'Профиль и перенос данных', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await page.getByRole('button', { name: 'Обучение', exact: true }).click();
    await expect(page.locator('[data-action="start-lesson"]')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
