import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TypingSession } from '../src/course.js';
import { emptyProfile, makeBackup, parseBackup } from '../src/storage.js';

test('input is ignored before start, during pause and after completion', () => {
  const session = new TypingSession('ab');
  session.type('a', 0);
  assert.equal(session.attempts, 0);
  session.start(0);
  session.type('a', 100);
  session.pause(1100);
  session.type('b', 2000);
  session.backspace();
  assert.equal(session.position, 1);
  session.start(3000);
  session.type('b', 4000);
  session.type('x', 5000);
  session.backspace();
  assert.equal(session.position, 2);
  assert.equal(session.attempts, 2);
  assert.equal(session.time(10000), 2000);
});

test('backspace can rewind correct input without losing accumulated errors', () => {
  const session = new TypingSession('ab');
  session.start(0);
  session.backspace();
  assert.equal(session.position, 0);
  session.type('x', 100);
  session.backspace();
  session.type('a', 200);
  session.backspace();
  session.type('a', 300);
  session.type('b', 1100);
  assert.equal(session.accuracy(), 75);
  assert.deepEqual(session.mistakes, { a: 1 });
});

test('repeated pauses before first input do not start the timer', () => {
  const session = new TypingSession('ab');
  session.start(0);
  session.pause(1000);
  session.start(2000);
  assert.equal(session.time(3000), 0);
  assert.equal(session.speed(3000), 0);
  session.type('a', 4000);
  session.pause(5000);
  session.pause(6000);
  assert.equal(session.time(7000), 1000);
});

test('integration: session results survive JSON backup and migrate best lesson progress', () => {
  const data = emptyProfile();
  for (const wrong of [false, true]) {
    const session = new TypingSession('фы');
    session.start(0);
    if (wrong) {
      session.type('x', 100);
      session.backspace();
    }
    session.type('ф', 200);
    session.type('ы', 1200);
    data.history.push({
      date: '2026-01-01T00:00:00.000Z',
      language: 'ru',
      kind: 'lesson',
      lesson: 0,
      title: 'Исходная позиция',
      accuracy: session.accuracy(),
      speed: session.speed(),
      duration: session.time(),
      mistakes: session.mistakes,
      length: session.text.length,
    });
  }
  const restored = parseBackup(JSON.parse(JSON.stringify(makeBackup(data))));
  assert.deepEqual(restored.history, data.history);
  assert.equal(restored.progress.ru[0], 100);
  restored.history = [];
  assert.equal(parseBackup(makeBackup(restored)).progress.ru[0], 100);
});
