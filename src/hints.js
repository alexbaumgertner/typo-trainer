// The course can be opened out of order, so reduce help based on mastered lessons.
export function hintLevel(mode, progress, lessonCount) {
  if (mode === 'always') return 'full';
  if (mode === 'off') return 'none';
  const passed = Object.values(progress || {}).filter((accuracy) => accuracy >= 95).length;
  if (passed >= Math.ceil(lessonCount / 2)) return 'none';
  if (passed >= Math.ceil(lessonCount / 4)) return 'key';
  return 'full';
}
