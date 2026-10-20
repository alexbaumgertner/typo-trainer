import { keyInfo, seededRandom } from './course.js';

// The selected lesson and all preceding lessons define what has been shown in this course.
export function learnedCharacters(lessons, index) {
  const known = new Set([' ']);
  for (const lesson of lessons.slice(0, index + 1)) {
    for (const char of lesson.keys + lesson.text) known.add(char);
  }
  return known;
}

export function keyLabel(language, char) {
  if (char === ' ') return 'Пробел';
  const info = keyInfo(language, char);
  if (!info?.shift) return char;
  return `${char} (${info.finger < 4 ? 'правый' : 'левый'} Shift)`;
}

// Older history has no per-key denominator and cannot support an error rate.
export function keyStatistics(history, learned) {
  const result = new Map([...learned].map((char) => [char, { shown: 0, errors: 0 }]));
  for (const entry of history
    .filter((item) => item.presentations && item.errorPositions)
    .slice(-10)) {
    for (const [char, shown] of Object.entries(entry.presentations)) {
      if (!result.has(char)) continue;
      const stat = result.get(char);
      stat.shown += shown;
      stat.errors += entry.errorPositions[char] || 0;
    }
  }
  return [...result].map(([char, stat]) => {
    const rate = stat.shown ? stat.errors / stat.shown : 0;
    // Wilson's conservative lower bound prevents a frequent key with a few errors
    // from displacing a less common key with a genuinely high observed error rate.
    const z = 1.96;
    const n = stat.shown;
    const lower = n
      ? (rate +
          (z * z) / (2 * n) -
          z * Math.sqrt((rate * (1 - rate)) / n + (z * z) / (4 * n * n))) /
        (1 + (z * z) / n)
      : 0;
    return { char, ...stat, rate, lower, sufficient: n >= 12, difficult: n >= 12 && lower > 0.05 };
  });
}

export function shiftStatistics(language, statistics) {
  const shifts = { left: { shown: 0, errors: 0 }, right: { shown: 0, errors: 0 } };
  for (const stat of statistics) {
    const info = keyInfo(language, stat.char);
    if (!info?.shift) continue;
    const side = info.finger < 4 ? 'right' : 'left';
    shifts[side].shown += stat.shown;
    shifts[side].errors += stat.errors;
  }
  return shifts;
}

function uniqueKnown(chars, learned, language) {
  return [...new Set(chars)].filter((char) => learned.has(char) && keyInfo(language, char));
}

export function fingerKeys(language, learned, finger) {
  return uniqueKnown(
    [...learned].filter((char) => keyInfo(language, char)?.finger === finger),
    learned,
    language,
  );
}

export function handKeys(language, learned, hand) {
  return uniqueKnown(
    [...learned].filter((char) => {
      const finger = keyInfo(language, char)?.finger;
      return finger !== undefined && finger !== 8 && (hand === 'left' ? finger < 4 : finger >= 4);
    }),
    learned,
    language,
  );
}

function movementOrder(language, chars) {
  return [...chars].sort((a, b) => {
    const x = keyInfo(language, a),
      y = keyInfo(language, b);
    const rank = (info) =>
      (info.row === 2 ? 0 : info.row === 1 ? 1 : info.row === 3 ? 2 : 3) + (info.shift ? 4 : 0);
    return rank(x) - rank(y) || x.col - y.col;
  });
}

/** Seed and selections reproduce the same text. Groups alternate when two are supplied. */
export function generateExercise({ language, learned, groups, seed, gradual = false, count = 72 }) {
  const pools = groups.map((group) => uniqueKnown(group, learned, language));
  if (!pools.length || pools.some((pool) => !pool.length)) return '';
  const rng = seededRandom(seed);
  const usage = new Map(),
    transitions = new Map();
  const output = [];
  const ordered = pools.map((pool) => movementOrder(language, pool));
  const steps = gradual ? Math.max(...ordered.map((pool) => pool.length)) : 1;
  for (let phase = 0; phase < steps; phase++) {
    const active = ordered.map((pool) => (gradual ? pool.slice(0, phase + 1) : pool));
    const frequency = gradual ? new Map() : usage;
    let phaseCount = gradual
      ? phase === steps - 1
        ? Math.max(24, count / 2)
        : 10
      : Math.max(count, ...pools.map((p) => p.length * 4));
    if (
      phase === steps - 1 &&
      active.length === 2 &&
      active[1].length === 1 &&
      active[1][0] === ' ' &&
      phaseCount % 2 === 0
    )
      phaseCount++;
    for (let i = 0; i < phaseCount; i++) {
      const pool = active[output.length % active.length];
      const previous = output.at(-1);
      const eligible = pool.filter(
        (char) =>
          char !== ' ' ||
          (output.length > 0 && previous !== ' ' && !(phase === steps - 1 && i === phaseCount - 1)),
      );
      if (!eligible.length) return '';
      const lowest = Math.min(...eligible.map((char) => frequency.get(char) || 0));
      const candidates = eligible.filter((char) => (frequency.get(char) || 0) === lowest);
      const ranked = candidates
        .map((char) => ({
          char,
          score:
            (transitions.get(`${previous}\u0000${char}`) || 0) * 3 +
            (previous === char ? 2 : 0) +
            rng(),
        }))
        .sort((a, b) => a.score - b.score);
      const char = ranked[0].char;
      output.push(char);
      frequency.set(char, (frequency.get(char) || 0) + 1);
      transitions.set(
        `${previous}\u0000${char}`,
        (transitions.get(`${previous}\u0000${char}`) || 0) + 1,
      );
    }
  }
  if (!learned.has(' ') || pools.some((pool) => pool.includes(' '))) return output.join('');
  let text = '',
    chunk = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < output.length; i++) {
    if (i === chunk) {
      text += ' ';
      chunk = i + 4 + Math.floor(rng() * 3);
    }
    text += output[i];
  }
  return text;
}
