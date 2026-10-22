import assert from 'node:assert/strict';
import { builtinLanguages, keyInfo } from '../src/course.js';
import { HandMotion, handPose } from '../src/ui/hand-motion.js';

const home = [0, 1, 2, 3, 6, 7, 8, 9].map((column) => ({ x: column * 50, y: 100 }));
const thumbs = [
  { x: 300, y: 200 },
  { x: 200, y: 200 },
];
const rest = handPose(home, null, null, null, thumbs, 50);
const target = { x: 50, y: 50 };
const ring = handPose(home, target, keyInfo(builtinLanguages.ru, 'ц'), null, thumbs, 50);
assert.equal(ring.tips[1].x, target.x);
assert.equal(ring.tips[1].y, target.y + 4);
assert.deepEqual(
  ring.palms[0],
  { x: 0, y: -50 },
  'The whole left hand moves to the ring finger key.',
);
assert.deepEqual(ring.palms[1], rest.palms[1], 'The other hand stays at home.');
for (const f of [0, 2, 3, 9])
  assert.deepEqual(
    ring.tips[f],
    { x: rest.tips[f].x + ring.palms[0].x, y: rest.tips[f].y + ring.palms[0].y },
    'The other fingers and the thumb keep their place relative to the palm.',
  );
for (const f of [4, 5, 6, 7, 8]) assert.deepEqual(ring.tips[f], rest.tips[f]);
const shifted = handPose(
  home,
  target,
  keyInfo(builtinLanguages.ru, 'Ц'),
  { x: 600, y: 150 },
  thumbs,
  50,
);
assert.deepEqual(shifted.tips[7], { x: 600, y: 150 }, 'Capital letters use opposite Shift.');
assert.deepEqual(shifted.palms[1], { x: 600 - 450, y: 50 }, 'The Shift hand moves as a whole.');
const space = handPose(home, thumbs[0], keyInfo(builtinLanguages.ru, ' '), null, thumbs, 50);
assert.equal(space.tips[8].y, thumbs[0].y + 4);
assert.deepEqual(space.tips[9], thumbs[1], 'Only one thumb presses space.');
const pinky = handPose(home, home[0], keyInfo(builtinLanguages.ru, 'ф'), null, thumbs, 50);
assert.notDeepEqual(pinky, rest, 'Home-row keys also have a visible press.');

let clock = 0,
  nextId = 0,
  last;
const frames = new Map();
const motion = new HandMotion({
  now: () => clock,
  requestFrame: (callback) => {
    frames.set(++nextId, callback);
    return nextId;
  },
  cancelFrame: (id) => frames.delete(id),
});
const draw = (pose) => {
  last = pose;
};
function advance(ms) {
  clock += ms;
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(clock);
}
motion.move(rest, ring, draw);
advance(110);
assert.ok(last.tips[1].y < rest.tips[1].y && last.tips[1].y > ring.tips[1].y);
advance(110);
assert.deepEqual(last, ring);
assert.equal(frames.size, 0, 'An idle hint does not run a permanent animation loop.');
motion.move(rest, ring, draw, { returnHome: true });
advance(110);
assert.deepEqual(last, rest, 'Even repeated keys return home before the next press.');
advance(190);
assert.deepEqual(last, ring);

motion.move(rest, pinky, draw, { demo: true });
for (const duration of [160, 450, 450, 450]) advance(duration);
assert.deepEqual(last, rest, 'The slow demonstration includes a return to home.');
advance(250);
advance(450);
assert.deepEqual(last, pinky);
assert.equal(frames.size, 0);

motion.move(rest, ring, draw);
advance(50);
motion.move(rest, space, draw);
assert.equal(frames.size, 1, 'Rapid typing replaces the old animation instead of queuing it.');
advance(220);
assert.deepEqual(last, space);
motion.move(rest, ring, draw, { instant: true, demo: true });
assert.deepEqual(last, ring);
assert.equal(frames.size, 0, 'Reduced motion renders a static pose.');
motion.move(rest, pinky, draw);
motion.stop();
assert.equal(frames.size, 0, 'Hiding hands cancels pending frames.');
console.log(
  'PASS: hand reach, home return, Shift, space, repeated keys, interruption and reduced motion.',
);
