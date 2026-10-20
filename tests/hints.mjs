import assert from 'node:assert/strict';
import { builtinLanguages } from '../src/course.js';
import { hintLevel, refreshKeyTooltips } from '../src/hints.js';

assert.equal(hintLevel('auto', {}, 16), 'full');
assert.equal(hintLevel('auto', { 0: 95, 1: 100, 2: 94, 3: 95 }, 16), 'full');
assert.equal(hintLevel('auto', { 0: 95, 1: 100, 2: 95, 3: 95 }, 16), 'key');
assert.equal(
  hintLevel('auto', Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, 95])), 16),
  'none',
);
assert.equal(hintLevel('auto', { 0: 95, 1: 95 }, 8), 'key');
assert.equal(hintLevel('auto', { 0: 95, 1: 95, 2: 95, 3: 95 }, 8), 'none');
assert.equal(hintLevel('always', {}, 16), 'full');
assert.equal(hintLevel('off', {}, 16), 'none');
const keys = [
  { dataset: { key: '2-3' }, title: '' },
  { dataset: { key: '2-6' }, title: '' },
];
refreshKeyTooltips(keys, builtinLanguages.en, 'full');
assert.deepEqual(
  keys.map((key) => key.title),
  ['f · Левый указательный', 'j · Правый указательный'],
);
refreshKeyTooltips(keys, builtinLanguages.en, 'none');
assert.deepEqual(
  keys.map((key) => key.title),
  ['f', 'j'],
);
refreshKeyTooltips(keys, builtinLanguages.en, 'key');
assert.deepEqual(
  keys.map((key) => key.title),
  ['f', 'j'],
);
refreshKeyTooltips(keys, builtinLanguages.en, 'full');
assert.deepEqual(
  keys.map((key) => key.title),
  ['f · Левый указательный', 'j · Правый указательный'],
);
console.log('PASS: gradual hints follow completed lessons, manual mode, and tooltip changes.');
