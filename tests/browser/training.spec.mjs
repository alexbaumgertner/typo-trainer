import { test, expect } from '@playwright/test';

async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('ritm-v1')));
}

for (const [language, text] of [
  ['ru', 'фы ва'],
  ['en', 'as df'],
]) {
  test(`practice in ${language}: validation, correction, pause, completion and persistence`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Язык обучения').selectOption(language);
    await page.getByRole('button', { name: 'Практика', exact: true }).click();
    await page.getByLabel('Ваш текст').fill('🙂');
    await page.getByRole('button', { name: 'Начать тренировку' }).click();
    await expect(page.locator('#practice-error')).toContainText('нет символов');
    await page.getByLabel('Ваш текст').fill(`  ${text.replace(' ', '\n')}  `);
    await page.getByRole('button', { name: 'Начать тренировку' }).click();
    await expect(page.locator('#typing-count')).toHaveText('0 / 5 символов');
    await page.keyboard.type('x');
    await expect(page.locator('#cursor')).toHaveClass(/error/);
    await page.keyboard.type(text[0]);
    await expect(page.locator('#typing-count')).toHaveText('0 / 5 символов');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(text[0]);
    await page.keyboard.press('Escape');
    await expect(page.locator('#typing-feedback')).toContainText('Пауза');
    await page.keyboard.type(text[1]);
    await expect(page.locator('#typing-count')).toHaveText('1 / 5 символов');
    await page.locator('#pause-button').click();
    await page.getByLabel('Язык обучения').focus();
    await expect(page.locator('#typing-feedback')).toContainText('Пауза');
    await page.locator('#pause-button').click();
    await page.keyboard.type(text.slice(1));
    await expect(page.getByRole('dialog')).toContainText('Тренировка завершена');
    await expect(page.getByRole('dialog')).toContainText('83.3%');
    const data = await stored(page);
    expect(data.history).toHaveLength(1);
    expect(data.history[0]).toMatchObject({
      language,
      kind: 'practice',
      lesson: null,
      length: 5,
      accuracy: 83.3,
      mistakes: { [text[0]]: 1 },
    });
    await page.reload();
    await page.getByRole('button', { name: 'Мой прогресс', exact: true }).click();
    await expect(page.locator('#main')).toContainText('Свой текст');
    expect((await stored(page)).history).toEqual(data.history);
  });
}

test('completed lesson and next lesson selection persist after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Язык обучения').selectOption('en');
  await page.locator('[data-action="start-lesson"]').click();
  const text = await page.locator('#typing-text .char').allTextContents();
  await page.keyboard.type(text.join(''));
  await expect(page.getByRole('dialog')).toContainText('Урок выполнен');
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.locator('[data-lesson="1"]').click();
  await expect(page.locator('#course-count')).toHaveText('1 / 16 выполнено');
  await page.reload();
  await expect(page.locator('#course-count')).toHaveText('1 / 16 выполнено');
  expect(await stored(page)).toMatchObject({
    selected: 'en',
    lessons: { en: 1 },
    progress: { en: { 0: 100 } },
  });
});
