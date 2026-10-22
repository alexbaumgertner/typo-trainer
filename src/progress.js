export const PASS_ACCURACY = 95;

export function localDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function exerciseKey(text) {
  let first = 2166136261;
  let second = 2246822519;
  for (const char of text) {
    const code = char.codePointAt(0);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return `${text.length}-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

export function recordSessionHelp(session, flags) {
  if (!session || !['running', 'paused'].includes(session.status)) return;
  session.helpFlags |= flags;
  session.hintsUsed = session.helpFlags !== 0;
}

export function lessonState(profile, language, lesson) {
  const completed = (profile.progress[language]?.[lesson] ?? 0) >= PASS_ACCURACY;
  const check = profile.reinforcement?.[language]?.[lesson];
  return {
    completed,
    mastered: completed && Boolean(check?.masteredDay),
    firstPassedDay: check?.firstPassedDay ?? null,
  };
}

export function recordLessonResult(profile, result) {
  const { language, lesson, accuracy, localDay: day, hintsUsed } = result;
  profile.progress[language] ??= {};
  profile.progress[language][lesson] = Math.max(profile.progress[language][lesson] ?? 0, accuracy);
  if (accuracy < PASS_ACCURACY) return;
  profile.reinforcement[language] ??= {};
  const check = (profile.reinforcement[language][lesson] ??= {
    firstPassedDay: day,
    masteredDay: null,
  });
  if (day < check.firstPassedDay) check.firstPassedDay = day;
  if (!check.masteredDay && hintsUsed === false && day > check.firstPassedDay)
    check.masteredDay = day;
}

export function comparisonKey(entry) {
  return entry.kind === 'lesson' &&
    Number.isInteger(entry.helpFlags) &&
    typeof entry.exerciseKey === 'string'
    ? `${entry.lesson}:${entry.exerciseKey}:${entry.helpFlags}`
    : null;
}
