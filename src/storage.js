import { builtinLanguages, keyInfo, lessonsFor } from './course.js';

export const STORAGE_KEY = 'ritm-v1';
const BACKUP_FORMAT = 'ritm-profile';
const BACKUP_VERSION = 1;
const ROW_LENGTHS = [13, 12, 11, 10];
const SETTING_KEYS = ['colors', 'letters', 'hands'];

export function emptyProfile() {
  return {
    profile: { name: '' },
    history: [],
    customLanguages: {},
    selected: 'ru',
    lessons: {},
    progress: {},
    retrainingKeys: {},
    fingerMarks: {},
    settings: { colors: true, letters: true, hands: false, hintMode: 'auto' },
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireValid(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(value, maximumLength, label) {
  requireValid(
    typeof value === 'string' && value.length <= maximumLength,
    `Некорректное поле «${label}».`,
  );
  return value;
}

function readNumber(value, maximum, label) {
  requireValid(
    Number.isFinite(value) && value >= 0 && value <= maximum,
    `Некорректное поле «${label}».`,
  );
  return value;
}

function isLessonIndex(language, index) {
  return Number.isInteger(index) && index >= 0 && index < lessonsFor(language).length;
}

function readBackupContents(input) {
  requireValid(isRecord(input), 'Файл должен содержать данные профиля Ритма.');
  // Legacy ritm-progress.json files store the profile without a versioned envelope.
  if (!('format' in input) && !('version' in input)) return input;
  requireValid(input.format === BACKUP_FORMAT, 'Это не файл профиля Ритма.');
  requireValid(input.version === BACKUP_VERSION, 'Версия файла пока не поддерживается.');
  return input.data;
}

function readSettings(settings) {
  const result = emptyProfile().settings;
  for (const key of SETTING_KEYS) {
    if (settings[key] === undefined) continue;
    requireValid(
      typeof settings[key] === 'boolean',
      'Настройки должны содержать переключатели true/false.',
    );
    result[key] = settings[key];
  }
  if (settings.hintMode !== undefined) {
    requireValid(
      ['auto', 'always', 'off'].includes(settings.hintMode),
      'Некорректный режим подсказок.',
    );
    result.hintMode = settings.hintMode;
  }
  return result;
}

function hasValidKeyboardRows(rows) {
  return (
    Array.isArray(rows) &&
    rows.length === ROW_LENGTHS.length &&
    rows.every(
      (row, index) =>
        typeof row === 'string' &&
        row.length === ROW_LENGTHS[index] &&
        !/[\s\u0000-\u001f\u007f-\u009f]/.test(row),
    )
  );
}

function readCustomLanguage(id, source) {
  requireValid(
    /^custom-[a-z0-9-]+$/.test(id) && id.length <= 80 && isRecord(source) && source.custom === true,
    'Некорректная пользовательская раскладка.',
  );
  const name = readText(source.name, 30, 'название языка');
  const layout = readText(source.layout, 30, 'название раскладки');
  requireValid(name.trim() && layout.trim(), 'У раскладки должно быть название.');
  requireValid(
    hasValidKeyboardRows(source.rows) && hasValidKeyboardRows(source.shift),
    'Раскладка должна содержать ряды из 13, 12, 11 и 10 отдельных символов.',
  );
  const allKeys = source.rows.join('');
  requireValid(new Set(allKeys).size === allKeys.length, 'В раскладке повторяются клавиши.');
  const text = readText(source.text, 1500, 'учебный текст');
  requireValid(text.trim().length > 0, 'Учебный текст не должен быть пустым.');
  const language = {
    name,
    layout,
    rows: [...source.rows],
    shift: [...source.shift],
    text,
    custom: true,
  };
  requireValid(
    Array.from(text).every((character) => keyInfo(language, character)),
    'Учебный текст содержит символы вне своей раскладки.',
  );
  return language;
}

function readCustomLanguages(source = {}) {
  requireValid(
    isRecord(source) && Object.keys(source).length <= 50,
    'Некорректный список пользовательских раскладок.',
  );
  return Object.fromEntries(
    Object.entries(source).map(([id, language]) => [id, readCustomLanguage(id, language)]),
  );
}

function readLessonPositions(source, languages) {
  requireValid(isRecord(source), 'Некорректный список выбранных уроков.');
  const positions = {};
  for (const [languageId, index] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, languageId) && isLessonIndex(languages[languageId], index),
      'В файле указан несуществующий урок.',
    );
    positions[languageId] = index;
  }
  return positions;
}

function readMistakes(source, language) {
  requireValid(
    isRecord(source) && Object.keys(source).length <= 100,
    'Некорректная статистика ошибок.',
  );
  const mistakes = {};
  for (const [character, count] of Object.entries(source)) {
    requireValid(
      character.length === 1 &&
        keyInfo(language, character) &&
        Number.isInteger(count) &&
        count > 0 &&
        count <= 1000000,
      'Некорректная статистика ошибок.',
    );
    mistakes[character] = count;
  }
  return mistakes;
}

function readRetrainingKeys(source, languages) {
  requireValid(isRecord(source), 'Некорректный выбор клавиш переучивания.');
  const result = {};
  for (const [id, keys] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, id) && Array.isArray(keys) && keys.length <= 8,
      'Некорректный выбор клавиш переучивания.',
    );
    requireValid(
      keys.every(
        (key) =>
          typeof key === 'string' &&
          key.length === 1 &&
          languages[id].rows.some((row) => row.includes(key)),
      ) && new Set(keys).size === keys.length,
      'Некорректный выбор клавиш переучивания.',
    );
    result[id] = [...keys];
  }
  return result;
}

function readFingerMarks(source, languages) {
  requireValid(isRecord(source), 'Некорректные отметки пальцев.');
  const result = {};
  for (const [id, marks] of Object.entries(source)) {
    requireValid(Object.hasOwn(languages, id), 'Некорректные отметки пальцев.');
    result[id] = readMistakes(marks, languages[id]);
  }
  return result;
}

function readHistoryEntry(entry, languages) {
  requireValid(
    isRecord(entry) &&
      Object.hasOwn(languages, entry.language) &&
      ['lesson', 'practice', 'retraining'].includes(entry.kind),
    'Некорректная запись истории занятий.',
  );
  const date = readText(entry.date, 100, 'дата');
  requireValid(Number.isFinite(Date.parse(date)), 'Некорректная дата занятия.');
  const language = languages[entry.language];
  const validLesson =
    entry.kind === 'lesson' ? isLessonIndex(language, entry.lesson) : entry.lesson === null;
  requireValid(validLesson, 'В истории указан несуществующий урок.');
  const length = readNumber(entry.length, 100000, 'число символов');
  requireValid(Number.isInteger(length), 'Число символов должно быть целым.');
  return {
    date: new Date(date).toISOString(),
    language: entry.language,
    kind: entry.kind,
    lesson: entry.lesson,
    title: readText(entry.title, 160, 'название занятия'),
    accuracy: readNumber(entry.accuracy, 100, 'точность'),
    speed: readNumber(entry.speed, 10000000, 'скорость'),
    duration: readNumber(entry.duration, 31536000000, 'время'),
    mistakes: readMistakes(entry.mistakes ?? {}, language),
    fingerMarks: readMistakes(entry.fingerMarks ?? {}, language),
    length,
  };
}

function readProgress(source, languages, history) {
  requireValid(isRecord(source), 'Некорректный прогресс курса.');
  const progress = {};
  for (const [languageId, records] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, languageId) && isRecord(records),
      'Некорректный прогресс курса.',
    );
    progress[languageId] = {};
    for (const [index, accuracy] of Object.entries(records)) {
      requireValid(
        /^(0|[1-9]\d*)$/.test(index) && isLessonIndex(languages[languageId], Number(index)),
        'В прогрессе указан несуществующий урок.',
      );
      progress[languageId][index] = readNumber(accuracy, 100, 'точность урока');
    }
  }
  // Reconstruct achievements from legacy backups that only contain history.
  for (const entry of history) {
    if (entry.kind !== 'lesson') continue;
    progress[entry.language] ??= {};
    const previousAccuracy = progress[entry.language][entry.lesson] ?? 0;
    progress[entry.language][entry.lesson] = Math.max(previousAccuracy, entry.accuracy);
  }
  return progress;
}

/** Validate untrusted JSON and return a new profile without mutating the input. */
export function parseBackup(input) {
  const source = readBackupContents(input);
  requireValid(
    isRecord(source) &&
      Array.isArray(source.history) &&
      isRecord(source.settings) &&
      typeof source.selected === 'string',
    'В файле нет профиля Ритма. Выберите JSON, скачанный из тренажёра.',
  );
  const result = emptyProfile();
  if (source.profile !== undefined) {
    requireValid(isRecord(source.profile), 'Некорректные данные профиля.');
    result.profile.name = readText(source.profile.name, 40, 'имя').trim();
  }
  result.settings = readSettings(source.settings);
  result.customLanguages = readCustomLanguages(source.customLanguages ?? {});
  const languages = { ...builtinLanguages, ...result.customLanguages };
  requireValid(Object.hasOwn(languages, source.selected), 'Выбранного языка нет в файле.');
  result.selected = source.selected;
  result.lessons = readLessonPositions(source.lessons ?? {}, languages);
  result.retrainingKeys = readRetrainingKeys(source.retrainingKeys ?? {}, languages);
  result.fingerMarks = readFingerMarks(source.fingerMarks ?? {}, languages);
  requireValid(source.history.length <= 500, 'В файле больше 500 занятий.');
  result.history = source.history.map((entry) => readHistoryEntry(entry, languages));
  result.progress = readProgress(source.progress ?? {}, languages, result.history);
  return result;
}

export function makeBackup(data) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: parseBackup(data),
  };
}
