import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const openProfile = (page) =>
  page
    .locator('header')
    .getByRole('button', { name: 'Профиль и перенос данных', exact: true })
    .click();

test('settings persist; exported profile is previewed before replacing another browser profile', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByLabel('Язык обучения').selectOption('en');
  await openProfile(page);
  await page.getByLabel('Ваше имя').fill('Александр');
  await page.getByLabel('Показать руки над клавиатурой').check();
  await page.getByRole('dialog').getByLabel('Буквы на клавишах').uncheck();
  await page.reload();
  await openProfile(page);
  await expect(page.getByLabel('Ваше имя')).toHaveValue('Александр');
  await expect(page.getByLabel('Показать руки над клавиатурой')).toBeChecked();
  await expect(page.getByRole('dialog').getByLabel('Буквы на клавишах')).not.toBeChecked();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать файл профиля' }).click();
  const download = await downloadPromise;
  const buffer = await readFile(await download.path());
  expect(JSON.parse(buffer).data.profile.name).toBe('Александр');
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto(page.url());
    await openProfile(other);
    await other.getByLabel('Ваше имя').fill('Другой');
    await other.locator('#import-file').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{'),
    });
    await expect(other.locator('#import-error')).toContainText('Не удалось прочитать JSON');
    await expect(other.locator('[data-action="apply-import"]')).toHaveCount(0);
    await other
      .locator('#import-file')
      .setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer });
    await expect(other.locator('#import-preview')).toContainText('Александр');
    await expect(other.getByLabel('Ваше имя')).toHaveValue('Другой');
    expect(
      await other.evaluate(() => JSON.parse(localStorage.getItem('ritm-v1')).profile.name),
    ).toBe('Другой');
    await other.getByRole('button', { name: 'Применить файл →' }).click();
    await expect(other.getByRole('dialog')).not.toBeVisible();
    await other.reload();
    await expect(other.getByLabel('Язык обучения')).toHaveValue('en');
    await openProfile(other);
    await expect(other.getByLabel('Ваше имя')).toHaveValue('Александр');
    await expect(other.getByLabel('Показать руки над клавиатурой')).toBeChecked();
    await expect(other.getByRole('dialog').getByLabel('Буквы на клавишах')).not.toBeChecked();
  } finally {
    await context.close();
  }
});
