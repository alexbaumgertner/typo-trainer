import { test, expect } from '@playwright/test';

for (const locale of ['uk', 'de', 'tr', 'fr', 'es']) {
  test(`${locale}: localized lesson, correction, saved selection and progress`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.locator('#language').selectOption(locale);
    await page.locator('#interface-language').selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('.lesson-button')).toHaveCount(16);
    await page.locator('[data-action="start-lesson"]').click();
    const text = (await page.locator('#typing-text .char').allTextContents()).join('');
    await page.keyboard.type('x');
    await expect(page.locator('#cursor')).toHaveClass(/error/);
    await page.keyboard.press('Backspace');
    for (const char of text) await page.keyboard.insertText(char);
    await expect(page.locator('#dialog')).toBeVisible();
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('ritm-v1')));
    expect(profile.history[0]).toMatchObject({
      language: locale,
      kind: 'lesson',
      mistakes: { [text[0]]: 1 },
    });
    await page.reload();
    await expect(page.locator('#language')).toHaveValue(locale);
    await expect(page.locator('#interface-language')).toHaveValue(locale);
    await page.locator('[data-view="progress"]').click();
    await expect(page.locator('.history-table tbody tr')).toHaveCount(1);
    await page.locator('[data-view="practice"]').click();
    await page.locator('#custom-text').fill('🙂');
    await page.locator('#practice-form button').click();
    await expect(page.locator('#practice-error')).toContainText('🙂');
    await page.locator('#custom-text').fill('');
    await page.locator('#practice-form button').click();
    await expect(page.locator('#practice-error')).not.toBeEmpty();
    await page.locator('#help').click();
    await expect(page.locator('#dialog-content')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}

test('accent composition, Unicode normalization and independent interface language', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#language').selectOption('es');
  await page.locator('#interface-language').selectOption('fr');
  await page.locator('[data-view="practice"]').click();
  await page.locator('#custom-text').fill('a\u0301 ñ ü');
  await page.locator('#practice-form button').click();
  await expect(page.locator('#typing-text')).toHaveText('á ñ ü');
  // Simulate native dead-key delivery. OS-specific keyboard handling is outside Chromium automation.
  await page.locator('#typing-input').evaluate((input) => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Dead', bubbles: true }));
    const base = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    input.dispatchEvent(base);
    if (base.defaultPrevented) throw new Error('Dead-key base letter was intercepted');
    input.value = 'a\u0301';
    input.dispatchEvent(new InputEvent('input', { data: 'a\u0301', bubbles: true }));
  });
  for (const char of ' ñ ü') await page.keyboard.insertText(char);
  await expect(page.locator('.result-stats b').first()).toHaveText('100%');
  await page.locator('#close-dialog').click();
  await page.locator('[data-view="learn"]').click();
  await page.locator('[data-action="start-lesson"]').click();
  await page.keyboard.insertText('f');
  await page.locator('#interface-language').selectOption('de');
  await expect(page.locator('#typing-count')).toHaveText(/^1 \/ \d+ Zeichen$/);
  await expect(page.locator('.pause-cover')).toBeVisible();
  await expect(page.locator('#language')).toHaveValue('es');
});

test('profile import restores both languages and keeps user names literal', async ({ page }) => {
  await page.goto('/');
  await page.locator('#interface-language').selectOption('es');
  await page.locator('#language').selectOption('tr');
  await page.locator('[data-lesson="14"]').click();
  await page.locator('#open-profile').click();
  await page.locator('#profile-name').fill('Мой профиль <b>test</b>');
  const downloading = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download = await downloading;
  const exportedFile = await download.path();
  await page.locator('#close-dialog').click();
  await page.locator('#language').selectOption('fr');
  await page.locator('#interface-language').selectOption('de');
  await page.locator('#open-profile').click();
  await page
    .locator('#import-file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#import-error')).toContainText('JSON');
  await page.locator('#import-file').setInputFiles(exportedFile);
  await page.locator('[data-action="apply-import"]').click();
  await expect(page.locator('#language')).toHaveValue('tr');
  await expect(page.locator('#interface-language')).toHaveValue('es');
  await expect(page.locator('#profile-label')).toHaveText('Мой профиль <b>test</b>');
  await expect(page.locator('#profile-label b')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.lesson-button.active')).toHaveAttribute('data-lesson', '14');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
