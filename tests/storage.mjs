import assert from 'node:assert/strict';
import { emptyProfile, parseBackup, makeBackup } from '../src/storage.js';
const data = emptyProfile();
data.profile.name = 'Александр';
data.settings.hands = true;
data.settings.letters = false;
data.settings.hintMode = 'always';
data.selected = 'en';
data.lessons = { en: 3 };
data.retrainingKeys = { en: ['q', 'w'], ru: ['й'] };
data.fingerMarks = { en: { q: 2 } };
data.customLanguages['custom-test'] = {
  name: 'Deutsch',
  layout: 'QWERTZ',
  rows: ['^1234567890ß´', 'qwertzuiopü+', 'asdfghjklöä', 'yxcvbnm,.-'],
  shift: ['°!"§$%&/()=?`', 'QWERTZUIOPÜ*', 'ASDFGHJKLÖÄ', 'YXCVBNM;:_'],
  text: 'Hallo Welt.',
  custom: true,
};
data.history = [
  {
    date: '2026-10-10T10:00:00.000Z',
    language: 'en',
    kind: 'lesson',
    lesson: 0,
    title: 'Исходная позиция',
    accuracy: 97,
    speed: 110,
    duration: 60000,
    mistakes: { f: 1 },
    fingerMarks: { f: 1 },
    length: 110,
  },
];
const clean = parseBackup(data);
assert.equal(clean.progress.en[0], 97);
assert.deepEqual(clean.retrainingKeys.en, ['q', 'w']);
assert.deepEqual(clean.fingerMarks.en, { q: 2 });
assert.deepEqual(clean.history[0].fingerMarks, { f: 1 });
assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(makeBackup(clean)))), clean);
const legacy = structuredClone(data);
delete legacy.profile;
delete legacy.progress;
delete legacy.settings.hands;
delete legacy.settings.hintMode;
delete legacy.retrainingKeys;
delete legacy.fingerMarks;
delete legacy.history[0].fingerMarks;
assert.equal(parseBackup({ ...legacy, exportedAt: '2026-10-10' }).history.length, 1);
assert.equal(parseBackup(legacy).settings.hands, false);
assert.equal(parseBackup(legacy).settings.hintMode, 'auto');
assert.deepEqual(parseBackup(legacy).retrainingKeys, {});
assert.deepEqual(parseBackup(legacy).history[0].fingerMarks, {});
const withKeyCounts = structuredClone(clean);
withKeyCounts.history[0].presentations = { f: 2, j: 108 };
withKeyCounts.history[0].errorPositions = { f: 1 };
assert.deepEqual(parseBackup(withKeyCounts).history[0].presentations, { f: 2, j: 108 });
const reject = (mutate) => {
  const copy = makeBackup(clean);
  mutate(copy);
  assert.throws(() => parseBackup(copy));
};
reject((v) => (v.version = 999));
reject((v) => (v.data.settings.hands = 'true'));
reject((v) => (v.data.settings.hintMode = 'invalid'));
reject((v) => (v.data.history[0].accuracy = 101));
reject((v) => (v.data.history[0].date = 'invalid'));
reject((v) => (v.data.history[0].duration = -1));
reject((v) => (v.data.selected = 'unknown'));
reject((v) => (v.data.lessons.en = 50));
reject((v) => (v.data.customLanguages['custom-test'].rows[1] = 'wrong'));
reject((v) => (v.data.history[0].mistakes.f = -1));
reject((v) => (v.data.retrainingKeys.en = ['q', 'q']));
reject((v) => (v.data.retrainingKeys.en = ['?']));
reject((v) => (v.data.fingerMarks.en.q = -1));
reject((v) => (v.data.history[0].fingerMarks.f = -1));
const invalidCounts = makeBackup(withKeyCounts);
invalidCounts.data.history[0].errorPositions.f = 3;
assert.throws(() => parseBackup(invalidCounts));
delete invalidCounts.data.history[0].errorPositions;
assert.throws(() => parseBackup(invalidCounts));
assert.throws(() => parseBackup({}));
const malicious = JSON.parse(
  '{"history":[],"settings":{},"selected":"ru","customLanguages":{"__proto__":{}}}',
);
assert.throws(() => parseBackup(malicious));
assert.equal({}.polluted, undefined);
const withoutHistory = structuredClone(clean);
withoutHistory.history = [];
assert.equal(parseBackup(withoutHistory).progress.en[0], 97);
console.log(
  'PASS: complete backup round trip, legacy migration, durable lesson progress, invalid files, prototype keys.',
);
