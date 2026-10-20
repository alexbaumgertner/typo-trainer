import assert from 'node:assert/strict';
import {
  comparisonKey,
  exerciseKey,
  lessonState,
  localDay,
  recordLessonResult,
} from '../src/progress.js';
import { emptyProfile, makeBackup, parseBackup } from '../src/storage.js';

const profile = emptyProfile();
const attempt = (day, accuracy, hintsUsed) => ({
  language: 'ru',
  lesson: 0,
  localDay: day,
  accuracy,
  hintsUsed,
});
assert.equal(localDay(new Date(2026, 9, 20, 23, 59)), '2026-10-20');
assert.equal(localDay(new Date(2026, 9, 21, 0, 1)), '2026-10-21');
recordLessonResult(profile, attempt('2026-10-20', 94.9, false));
assert.deepEqual(lessonState(profile, 'ru', 0), {
  completed: false,
  mastered: false,
  firstPassedDay: null,
});
recordLessonResult(profile, attempt('2026-10-20', 95, true));
recordLessonResult(profile, attempt('2026-10-20', 100, false));
recordLessonResult(profile, attempt('2026-10-21', 100, true));
assert.deepEqual(lessonState(profile, 'ru', 0), {
  completed: true,
  mastered: false,
  firstPassedDay: '2026-10-20',
});
recordLessonResult(profile, attempt('2026-10-21', 95, false));
assert.equal(lessonState(profile, 'ru', 0).mastered, true);
assert.equal(profile.reinforcement.ru[0].masteredDay, '2026-10-21');
recordLessonResult(profile, attempt('2026-10-22', 90, true));
assert.equal(lessonState(profile, 'ru', 0).mastered, true);

profile.history = [
  {
    date: '2026-10-21T12:00:00.000Z',
    localDay: '2026-10-21',
    language: 'ru',
    kind: 'lesson',
    lesson: 0,
    title: 'Урок',
    accuracy: 95,
    speed: 120,
    duration: 10000,
    mistakes: {},
    fingerMarks: { ф: 2 },
    length: 20,
    hintsUsed: false,
    helpFlags: 0,
    exerciseKey: exerciseKey('ф'.repeat(20)),
  },
];
const imported = parseBackup(JSON.parse(JSON.stringify(makeBackup(profile))));
assert.equal(imported.reinforcement.ru[0].masteredDay, '2026-10-21');
assert.deepEqual(imported.history[0].fingerMarks, { ф: 2 });
assert.equal(imported.history[0].hintsUsed, false);
assert.equal(imported.history[0].helpFlags, 0);
imported.history = [];
assert.equal(parseBackup(imported).reinforcement.ru[0].masteredDay, '2026-10-21');

const legacy = emptyProfile();
legacy.progress.ru = { 0: 97 };
legacy.history = profile.history.map(
  ({ localDay, hintsUsed, helpFlags, exerciseKey, fingerMarks, ...entry }) => entry,
);
delete legacy.reinforcement;
const old = parseBackup(legacy);
assert.equal(lessonState(old, 'ru', 0).completed, true);
assert.equal(lessonState(old, 'ru', 0).mastered, false);
assert.equal(old.history[0].hintsUsed, undefined);
assert.equal(old.history[0].fingerMarks, undefined);
assert.equal(comparisonKey(old.history[0]), null);
assert.equal(comparisonKey(profile.history[0]), `0:${exerciseKey('ф'.repeat(20))}:0`);
assert.equal(
  comparisonKey({ ...profile.history[0], hintsUsed: true, helpFlags: 7 }),
  `0:${exerciseKey('ф'.repeat(20))}:7`,
);
assert.notEqual(exerciseKey('ф'.repeat(20)), exerciseKey('а'.repeat(20)));
assert.notEqual(
  comparisonKey(profile.history[0]),
  comparisonKey({ ...profile.history[0], exerciseKey: exerciseKey('а'.repeat(20)) }),
);
assert.equal(comparisonKey({ ...profile.history[0], kind: 'practice' }), null);
recordLessonResult(old, attempt('2026-10-21', 95, true));
assert.equal(lessonState(old, 'ru', 0).mastered, false);
recordLessonResult(old, attempt('2026-10-22', 95, false));
assert.equal(lessonState(old, 'ru', 0).mastered, true);

assert.throws(() =>
  parseBackup({
    ...profile,
    reinforcement: { ru: { 0: { firstPassedDay: '2026-02-30', masteredDay: null } } },
  }),
);
assert.throws(() =>
  parseBackup({
    ...profile,
    reinforcement: { ru: { 0: { firstPassedDay: '2026-10-20', masteredDay: '2026-10-20' } } },
  }),
);
console.log(
  'PASS: date transitions, retries, independent reinforcement, legacy data, comparison groups and transfer.',
);
