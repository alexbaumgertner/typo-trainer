import assert from 'node:assert/strict';
import { builtinLanguages, lessonsFor, TypingSession, keyInfo, drill } from '../src/course.js';
import {
  learnedCharacters,
  keyStatistics,
  keyLabel,
  fingerKeys,
  handKeys,
  generateExercise,
} from '../src/exercises.js';

for (const language of Object.values(builtinLanguages)) {
  const lessons = lessonsFor(language);
  for (const index of [0, 2, 3, 7, 12, 14, 15]) {
    const learned = learnedCharacters(lessons, index);
    const all = [...learned].filter((char) => char !== ' ');
    const text = generateExercise({
      language,
      learned,
      groups: [all],
      seed: 'coverage',
      count: all.length * 4,
    });
    assert.ok([...text].every((char) => learned.has(char) && keyInfo(language, char)));
    assert.ok(
      all.every((char) => text.includes(char)),
      `lesson ${index}: every target appears`,
    );
    if (index < 14) assert.ok([...text].every((char) => !keyInfo(language, char).shift));
    for (const finger of [0, 1, 3, 6, 7]) {
      const targets = fingerKeys(language, learned, finger);
      if (!targets.length) continue;
      const exercise = generateExercise({
        language,
        learned,
        groups: [targets],
        seed: 'finger',
        gradual: [0, 1, 6, 7].includes(finger),
      });
      assert.ok(
        targets.every((char) => exercise.includes(char)),
        `finger ${finger}: target coverage`,
      );
      assert.ok([...exercise].every((char) => char === ' ' || targets.includes(char)));
      if ([0, 1, 6, 7].includes(finger) && targets.length > 1) {
        const first = [...exercise].filter((char) => char !== ' ').slice(0, 10);
        assert.equal(new Set(first).size, 1, 'new finger movements start with the home key');
        const second = [...exercise].filter((char) => char !== ' ').slice(10, 20);
        assert.equal(new Set(second).size, 2, 'new movement is mixed with the familiar one');
      }
    }
    const left = handKeys(language, learned, 'left');
    const right = handKeys(language, learned, 'right');
    const alternating = generateExercise({
      language,
      learned,
      groups: [left, right],
      seed: 'alternate',
    }).replaceAll(' ', '');
    assert.ok([...alternating].every((char, i) => (i % 2 ? right : left).includes(char)));
    assert.ok(left.every((char) => alternating.includes(char)));
    assert.ok(right.every((char) => alternating.includes(char)));
    const thumb = generateExercise({
      language,
      learned,
      groups: [left.slice(0, 2), [' ']],
      seed: 'thumb',
      gradual: index === 3,
    });
    assert.ok(thumb.includes(' ') && !thumb.startsWith(' ') && !thumb.endsWith(' '));
    assert.ok(
      [...thumb].every((char, i) => (i % 2 ? char === ' ' : left.slice(0, 2).includes(char))),
    );
  }
  const known = learnedCharacters(lessons, 14);
  const shifted = [...known].find((char) => keyInfo(language, char)?.shift);
  assert.ok(shifted);
  assert.match(keyLabel(language, shifted), /Shift/);
  const same = {
    language,
    learned: known,
    groups: [[...known].filter((char) => char !== ' ')],
    count: 120,
  };
  const a = generateExercise({ ...same, seed: 'alpha' });
  assert.equal(a, generateExercise({ ...same, seed: 'alpha' }));
  assert.notEqual(a, generateExercise({ ...same, seed: 'beta' }));
  const counts = Object.values(
    [...a]
      .filter((char) => char !== ' ')
      .reduce((map, char) => {
        map[char] = (map[char] || 0) + 1;
        return map;
      }, {}),
  );
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, 'target frequency stays balanced');
}
const learned = new Set(['a', 'A', ' ']);
const spaceText = generateExercise({
  language: builtinLanguages.en,
  learned,
  groups: [[' ', 'a', 'A']],
  seed: 'space',
});
assert.ok(spaceText.includes(' ') && !spaceText.startsWith(' ') && !spaceText.endsWith(' '));
assert.ok(!spaceText.includes('  '));
const pairLanguage = builtinLanguages.en;
const pairText = generateExercise({
  language: pairLanguage,
  learned: learnedCharacters(lessonsFor(pairLanguage), 3),
  groups: [['f', 'j', 'd']],
  seed: 'pairs',
  count: 120,
}).replaceAll(' ', '');
const pairCounts = {};
for (let i = 1; i < pairText.length; i++) {
  const pair = pairText[i - 1] + pairText[i];
  pairCounts[pair] = (pairCounts[pair] || 0) + 1;
}
assert.equal(Object.keys(pairCounts).length, 9);
assert.ok(Math.max(...Object.values(pairCounts)) - Math.min(...Object.values(pairCounts)) <= 3);
assert.equal(drill('abc', 24, 'one'), drill('abc', 24, 'one'));
assert.notEqual(drill('abc', 24, 'one'), drill('abc', 24, 'two'));
assert.ok([...drill('abc', 24, 'one')].every((char) => 'abc '.includes(char)));
assert.ok(keyStatistics([], learned).every((stat) => !stat.sufficient && !stat.difficult));
const stats = keyStatistics(
  [{ presentations: { a: 200, A: 20, ' ': 4 }, errorPositions: { a: 3, A: 8, ' ': 2 } }],
  learned,
);
assert.equal(stats.find((stat) => stat.char === 'a').difficult, false);
assert.equal(stats.find((stat) => stat.char === 'A').difficult, true);
assert.equal(stats.find((stat) => stat.char === ' ').sufficient, false);
const session = new TypingSession('a A');
session.start(0);
session.type('x', 1);
session.backspace();
session.type('x', 2);
session.backspace();
for (const char of 'a A') session.type(char, 3);
assert.deepEqual(session.presentations(), { a: 1, ' ': 1, A: 1 });
assert.deepEqual(session.errorPositions, { a: 1 });
assert.deepEqual(session.mistakes, { a: 2 });
console.log(
  'PASS: target coverage, learned keys, finger and hand alternation, gradual introduction, seed, per-key evidence.',
);
