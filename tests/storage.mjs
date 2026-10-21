import assert from 'node:assert/strict';
import { emptyProfile, parseBackup, makeBackup } from '../src/storage.js';
const data = emptyProfile();
data.profile.name = 'Александр';
data.settings.hands = true;
data.settings.letters = false;
data.selected = 'en';
data.lessons = { en: 3 };
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
    length: 110,
  },
];
const clean = parseBackup(data);
assert.equal(clean.progress.en[0], 97);
assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(makeBackup(clean)))), clean);
const legacy = structuredClone(data);
delete legacy.profile;
delete legacy.progress;
delete legacy.settings.hands;
delete legacy.settings.analytics;
assert.equal(parseBackup({ ...legacy, exportedAt: '2026-10-10' }).history.length, 1);
assert.equal(parseBackup(legacy).settings.hands, false);
// Profiles saved before the analytics setting existed default to enabled.
assert.equal(legacy.settings.analytics, undefined);
assert.equal(parseBackup(legacy).settings.analytics, true);
const legacyFile = { history: legacy.history, settings: { colors: true }, selected: 'en' };
assert.equal(parseBackup(legacyFile).settings.analytics, true);
// The choice survives export and import.
const optedOut = structuredClone(clean);
optedOut.settings.analytics = false;
assert.equal(makeBackup(optedOut).data.settings.analytics, false);
assert.equal(
  parseBackup(JSON.parse(JSON.stringify(makeBackup(optedOut)))).settings.analytics,
  false,
);
assert.equal(makeBackup(clean).data.settings.analytics, true);
const reject = (mutate) => {
  const copy = makeBackup(clean);
  mutate(copy);
  assert.throws(() => parseBackup(copy));
};
reject((v) => (v.version = 999));
reject((v) => (v.data.settings.hands = 'true'));
reject((v) => (v.data.settings.analytics = 'false'));
reject((v) => (v.data.history[0].accuracy = 101));
reject((v) => (v.data.history[0].date = 'invalid'));
reject((v) => (v.data.history[0].duration = -1));
reject((v) => (v.data.selected = 'unknown'));
reject((v) => (v.data.lessons.en = 50));
reject((v) => (v.data.customLanguages['custom-test'].rows[1] = 'wrong'));
reject((v) => (v.data.history[0].mistakes.f = -1));
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
