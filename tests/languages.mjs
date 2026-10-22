import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { builtinLanguages, keyInfo, keyLabel, lessonsFor, TypingSession } from '../src/course.js';
import { catalogs, interfaceLanguages, setLocale, getLocale, t } from '../src/i18n.js';
import { emptyProfile, parseBackup, makeBackup } from '../src/storage.js';

assert.deepEqual(Object.keys(builtinLanguages), ['ru', 'en', 'uk', 'de', 'tr', 'fr', 'es']);
const sourceCourses = Object.fromEntries(
  Object.entries(builtinLanguages).map(([id, language]) => [id, lessonsFor(language)]),
);
const keys = Object.keys(catalogs.uk).sort();
for (const [locale, messages] of Object.entries(catalogs)) {
  assert.deepEqual(Object.keys(messages).sort(), keys, `${locale}: missing translations`);
  assert.ok(Object.values(messages).every((value) => typeof value === 'string' && value.trim()));
  setLocale(locale);
  assert.equal(getLocale(), locale);
  for (const [id, language] of Object.entries(builtinLanguages)) {
    const course = lessonsFor(language);
    for (const lesson of course) {
      const original = sourceCourses[id][lesson.id];
      assert.equal(lesson.text, original.text, 'Changing UI language must not translate exercises');
      for (const field of ['title', 'focus', 'section'])
        assert.notEqual(lesson[field], original[field], `${locale}/${id}: untranslated ${field}`);
    }
    const profile = emptyProfile();
    profile.uiLanguage = locale;
    profile.selected = id;
    profile.lessons[id] = 15;
    profile.progress[id] = { 15: 99 };
    profile.history = [
      {
        date: '2026-10-22T10:00:00Z',
        language: id,
        kind: 'lesson',
        lesson: 15,
        title: course[15].title,
        accuracy: 99,
        speed: 120,
        duration: 60000,
        mistakes: { [language.text[0]]: 1 },
        length: language.text.length,
      },
    ];
    const clean = parseBackup(profile);
    assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(makeBackup(profile)))), clean);
  }
}
setLocale('ru');
assert.equal(t('Unknown message'), 'Unknown message');
setLocale('de');
assert.equal(t('__proto__'), '__proto__');
setLocale('__proto__');
assert.equal(getLocale(), 'ru');
const legacy = emptyProfile();
delete legacy.uiLanguage;
assert.equal(parseBackup(legacy).uiLanguage, 'ru');
for (const invalid of ['unknown', '__proto__', {}, null, 1])
  assert.throws(() => parseBackup({ ...legacy, uiLanguage: invalid }));

for (const [id, language] of Object.entries(builtinLanguages)) {
  assert.equal(
    new Set(language.rows.join('')).size,
    language.rows.join('').length,
    `${id}: duplicate keys`,
  );
  for (let row = 0; row < 4; row++) {
    assert.equal(language.rows[row].length, language.shift[row].length, `${id}: Shift row length`);
    for (const char of language.rows[row] + language.shift[row]) {
      const info = keyInfo(language, char);
      assert.ok(Number.isInteger(info.finger) && info.finger >= 0 && info.finger <= 7);
    }
  }
  for (const lesson of lessonsFor(language)) {
    const session = new TypingSession(lesson.text);
    session.start(0);
    for (const [index, char] of [...lesson.text].entries()) session.type(char, index * 100);
    assert.equal(session.status, 'done', `${id}/${lesson.id}: cannot complete`);
    assert.equal(session.accuracy(), 100);
  }
}
for (const [id, chars] of Object.entries({
  uk: 'ґҐєЄіІїЇ',
  de: 'äÄöÖüÜß',
  tr: 'iİıIğĞşŞçÇöÖüÜ',
  fr: 'éèçàùêâëï',
  es: 'ñÑáéíóúüÁÉÍÓÚÜ¿¡',
})) {
  for (const char of chars) assert.ok(keyInfo(builtinLanguages[id], char), `${id}: ${char}`);
}
assert.equal(keyLabel(builtinLanguages.tr, 'i'), 'İ');
assert.equal(keyLabel(builtinLanguages.tr, 'ı'), 'I');
assert.equal(keyLabel(builtinLanguages.de, 'ß'), 'ß');
assert.equal(keyLabel(builtinLanguages.fr, 'é'), 'é');
assert.equal(keyInfo(builtinLanguages.fr, '1').shift, true);
assert.equal(keyInfo(builtinLanguages.fr, 'é').shift, false);
assert.equal(keyInfo(builtinLanguages.es, 'á').deadKey, '´');
assert.equal(keyInfo(builtinLanguages.fr, 'ê').deadKey, '^');
assert.equal(keyInfo(builtinLanguages.uk, 'ґ').finger, 0);
assert.equal(keyInfo(builtinLanguages.de, 'y').finger, 0);
assert.equal(keyInfo(builtinLanguages.tr, ',').finger, 7);

// Every explicit source message in the UI and storage must exist in all catalogs.
for (const file of ['app.js', 'storage.js', 'exercises.js']) {
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/\bt\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*\)/g)) {
    // Source-only literals, never untrusted runtime data.
    const message = Function(`return ${match[1]}`)();
    for (const locale of Object.keys(interfaceLanguages).filter((id) => id !== 'ru'))
      assert.ok(Object.hasOwn(catalogs[locale], message), `${locale}: missing ${message}`);
  }
}
console.log(
  'PASS: 112 complete lessons, 5 translation catalogs, national characters, ISO zones, 35 profile round trips and legacy UI defaults.',
);
