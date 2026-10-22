import assert from 'node:assert/strict';
import {
  builtinLanguages,
  lessonsFor,
  keyInfo,
  retrainingDrill,
  homePosition,
  TypingSession,
} from '../src/course.js';
for (const [id, language] of Object.entries(builtinLanguages)) {
  const course = lessonsFor(language),
    known = new Set([' ']);
  assert.equal(course.length, 16);
  for (const l of course) {
    assert.ok(l.text.length > 20);
    for (const c of l.keys) known.add(c);
    for (const c of l.text) {
      assert.ok(keyInfo(language, c), `${id} lesson ${l.id}: unmapped ${c}`);
      if (l.id < 14) assert.ok(known.has(c), `${id} lesson ${l.id}: not yet introduced ${c}`);
    }
  }
  assert.equal(keyInfo(language, ' ').finger, 8);
  assert.equal(keyInfo(language, language.rows[2][3]).finger, 3);
  assert.equal(keyInfo(language, language.rows[2][6]).finger, 4);
}
const s = new TypingSession('ab');
s.start(0);
assert.equal(s.time(100), 0);
s.type('x', 100);
assert.equal(s.errors, 1);
assert.equal(s.position, 0);
assert.equal(s.wrong, true);
s.type('a', 200);
assert.equal(s.attempts, 1);
s.backspace();
s.type('a', 300);
assert.equal(s.position, 1);
s.pause(1100);
assert.equal(s.time(3000), 1000);
s.start(4000);
s.type('b', 5000);
assert.equal(s.status, 'done');
assert.equal(s.time(10000), 2000);
assert.equal(s.accuracy(), 66.7);
assert.equal(s.speed(), 60);
assert.deepEqual(s.mistakes, { a: 1 });
const clean = new TypingSession('abc');
clean.start(0);
clean.type('a', 100);
clean.type('b', 1100);
clean.type('c', 2100);
assert.equal(clean.accuracy(), 100);
assert.equal(clean.speed(), 90);
assert.equal(homePosition(builtinLanguages.en), 'a s d f j k l ;');
assert.equal(retrainingDrill(builtinLanguages.en, ['q', 'w']), 'aqa sws aqa sws');
assert.equal(retrainingDrill(builtinLanguages.ru, ['й']), 'фйф фйф');
const retraining = new TypingSession(retrainingDrill(builtinLanguages.en, ['q']));
retraining.start(0);
retraining.type('a', 100);
retraining.type('q', 200);
assert.deepEqual(retraining.markWrongFinger(300), { key: 'q', combo: 'aqa' });
assert.equal(retraining.status, 'paused');
assert.equal(retraining.position, 0);
assert.equal(retraining.time(1000), 200);
assert.deepEqual(retraining.fingerMarks, { q: 1 });
assert.deepEqual(retraining.mistakes, {});
assert.equal(retraining.accuracy(), 100);
retraining.start(1000);
assert.equal(retraining.retry, null);
retraining.type('a', 1100);
retraining.type('q', 1200);
retraining.type('a', 1300);
assert.equal(retraining.position, 3);
console.log(
  'PASS: 112 lessons use introduced keys; keyboard mapping, corrections, accuracy, pause timing and completion.',
);
