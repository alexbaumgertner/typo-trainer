import { t, interfaceLanguages } from './i18n.js';
import { builtinLanguages, keyInfo, lessonsFor } from './course.js';

export const STORAGE_KEY = 'ritm-v1';
const BACKUP_FORMAT = 'ritm-profile';
const BACKUP_VERSION = 1;
const ROW_LENGTHS = [13, 12, 11, 10];
const SETTING_KEYS = [
  'colors',
  'letters',
  'hands',
  'latinHints',
  'guidance',
  'hideSpeed',
  'analytics',
];
export const LATIN_FONTS = ['sans', 'serif', 'mono'];

export function emptyProfile() {
  return {
    profile: { name: '' },
    history: [],
    customLanguages: {},
    selected: 'ru',
    uiLanguage: 'ru',
    lessons: {},
    progress: {},
    retrainingKeys: {},
    fingerMarks: {},
    reinforcement: {},
    settings: {
      colors: true,
      letters: true,
      hands: false,
      latinHints: false,
      latinFont: 'sans',
      latinColor: '#7a4fd0',
      hintMode: 'auto',
      guidance: true,
      hideSpeed: false,
      analytics: true,
    },
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
    `${t('Некорректное поле «')}${label}».`,
  );
  return value;
}

function readNumber(value, maximum, label) {
  requireValid(
    Number.isFinite(value) && value >= 0 && value <= maximum,
    `${t('Некорректное поле «')}${label}».`,
  );
  return value;
}

function isLessonIndex(language, index) {
  return Number.isInteger(index) && index >= 0 && index < lessonsFor(language).length;
}

function readBackupContents(input) {
  requireValid(isRecord(input), t('Файл должен содержать данные профиля Ритма.'));
  // Legacy ritm-progress.json files store the profile without a versioned envelope.
  if (!('format' in input) && !('version' in input)) return input;
  requireValid(input.format === BACKUP_FORMAT, t('Это не файл профиля Ритма.'));
  requireValid(input.version === BACKUP_VERSION, t('Версия файла пока не поддерживается.'));
  return input.data;
}

function readSettings(settings) {
  const result = emptyProfile().settings;
  for (const key of SETTING_KEYS) {
    if (settings[key] === undefined) continue;
    requireValid(
      typeof settings[key] === 'boolean',
      t('Настройки должны содержать переключатели true/false.'),
    );
    result[key] = settings[key];
  }
  if (settings.hintMode !== undefined) {
    requireValid(
      ['auto', 'always', 'off'].includes(settings.hintMode),
      t('Некорректный режим подсказок.'),
    );
    result.hintMode = settings.hintMode;
  }
  if (settings.latinFont !== undefined) {
    requireValid(LATIN_FONTS.includes(settings.latinFont), t('Некорректный шрифт латинских букв.'));
    result.latinFont = settings.latinFont;
  }
  if (settings.latinColor !== undefined) {
    requireValid(
      typeof settings.latinColor === 'string' && /^#[0-9a-f]{6}$/i.test(settings.latinColor),
      t('Некорректный цвет латинских букв.'),
    );
    result.latinColor = settings.latinColor.toLowerCase();
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
    t('Некорректная пользовательская раскладка.'),
  );
  const name = readText(source.name, 30, t('название языка'));
  const layout = readText(source.layout, 30, t('название раскладки'));
  requireValid(name.trim() && layout.trim(), t('У раскладки должно быть название.'));
  requireValid(
    hasValidKeyboardRows(source.rows) && hasValidKeyboardRows(source.shift),
    t('Раскладка должна содержать ряды из 13, 12, 11 и 10 отдельных символов.'),
  );
  const allKeys = source.rows.join('');
  requireValid(new Set(allKeys).size === allKeys.length, t('В раскладке повторяются клавиши.'));
  const text = readText(source.text, 1500, t('учебный текст'));
  requireValid(text.trim().length > 0, t('Учебный текст не должен быть пустым.'));
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
    t('Учебный текст содержит символы вне своей раскладки.'),
  );
  return language;
}

function readCustomLanguages(source = {}) {
  requireValid(
    isRecord(source) && Object.keys(source).length <= 50,
    t('Некорректный список пользовательских раскладок.'),
  );
  return Object.fromEntries(
    Object.entries(source).map(([id, language]) => [id, readCustomLanguage(id, language)]),
  );
}

function readLessonPositions(source, languages) {
  requireValid(isRecord(source), t('Некорректный список выбранных уроков.'));
  const positions = {};
  for (const [languageId, index] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, languageId) && isLessonIndex(languages[languageId], index),
      t('В файле указан несуществующий урок.'),
    );
    positions[languageId] = index;
  }
  return positions;
}

function readMistakes(source, language) {
  requireValid(
    isRecord(source) && Object.keys(source).length <= 100,
    t('Некорректная статистика ошибок.'),
  );
  const mistakes = {};
  for (const [character, count] of Object.entries(source)) {
    requireValid(
      character.length === 1 &&
        keyInfo(language, character) &&
        Number.isInteger(count) &&
        count > 0 &&
        count <= 1000000,
      t('Некорректная статистика ошибок.'),
    );
    mistakes[character] = count;
  }
  return mistakes;
}

function readRetrainingKeys(source, languages) {
  requireValid(isRecord(source), t('Некорректный выбор клавиш переучивания.'));
  const result = {};
  for (const [id, keys] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, id) && Array.isArray(keys) && keys.length <= 8,
      t('Некорректный выбор клавиш переучивания.'),
    );
    requireValid(
      keys.every(
        (key) =>
          typeof key === 'string' &&
          key.length === 1 &&
          languages[id].rows.some((row) => row.includes(key)),
      ) && new Set(keys).size === keys.length,
      t('Некорректный выбор клавиш переучивания.'),
    );
    result[id] = [...keys];
  }
  return result;
}

function readFingerMarks(source, languages) {
  requireValid(isRecord(source), t('Некорректные отметки пальцев.'));
  const result = {};
  for (const [id, marks] of Object.entries(source)) {
    requireValid(Object.hasOwn(languages, id), t('Некорректные отметки пальцев.'));
    result[id] = readMistakes(marks, languages[id]);
  }
  return result;
}

function readKeyCounts(source, language) {
  requireValid(
    isRecord(source) && Object.keys(source).length <= 100,
    t('Некорректная статистика клавиш.'),
  );
  const counts = {};
  for (const [character, count] of Object.entries(source)) {
    requireValid(
      character.length === 1 &&
        keyInfo(language, character) &&
        Number.isInteger(count) &&
        count > 0 &&
        count <= 100000,
      t('Некорректная статистика клавиш.'),
    );
    counts[character] = count;
  }
  return counts;
}

function readHistoryEntry(entry, languages) {
  requireValid(
    isRecord(entry) &&
      Object.hasOwn(languages, entry.language) &&
      ['lesson', 'practice', 'retraining'].includes(entry.kind),
    t('Некорректная запись истории занятий.'),
  );
  const date = readText(entry.date, 100, t('дата'));
  requireValid(Number.isFinite(Date.parse(date)), t('Некорректная дата занятия.'));
  const language = languages[entry.language];
  const validLesson =
    entry.kind === 'lesson' ? isLessonIndex(language, entry.lesson) : entry.lesson === null;
  requireValid(validLesson, t('В истории указан несуществующий урок.'));
  const length = readNumber(entry.length, 100000, t('число символов'));
  requireValid(Number.isInteger(length), t('Число символов должно быть целым.'));
  const hasKeyCounts = entry.presentations !== undefined || entry.errorPositions !== undefined;
  requireValid(
    !hasKeyCounts || (entry.presentations !== undefined && entry.errorPositions !== undefined),
    t('Неполная статистика клавиш.'),
  );
  const presentations = hasKeyCounts ? readKeyCounts(entry.presentations, language) : undefined;
  const errorPositions = hasKeyCounts ? readKeyCounts(entry.errorPositions, language) : undefined;
  if (hasKeyCounts) {
    requireValid(
      Object.values(presentations).reduce((sum, n) => sum + n, 0) === length,
      t('Число предъявлений не совпадает с длиной занятия.'),
    );
    for (const [char, errors] of Object.entries(errorPositions))
      requireValid(
        errors <= (presentations[char] || 0),
        t('Ошибок по клавише больше предъявлений.'),
      );
  }
  const localDay = entry.localDay === undefined ? null : readDay(entry.localDay);
  if (entry.hintsUsed !== undefined)
    requireValid(typeof entry.hintsUsed === 'boolean', t('Некорректное поле подсказок.'));
  if (entry.helpFlags !== undefined)
    requireValid(
      Number.isInteger(entry.helpFlags) &&
        entry.helpFlags >= 0 &&
        entry.helpFlags <= 63 &&
        (entry.helpFlags === 0
          ? entry.hintsUsed === false
          : entry.hintsUsed === true && (entry.helpFlags & 1) === 1),
      t('Некорректные условия подсказок.'),
    );
  if (entry.exerciseKey !== undefined)
    requireValid(
      typeof entry.exerciseKey === 'string' &&
        /^\d{1,6}-[0-9a-f]{16}$/.test(entry.exerciseKey) &&
        Number(entry.exerciseKey.split('-')[0]) === length,
      t('Некорректный идентификатор упражнения.'),
    );
  return {
    date: new Date(date).toISOString(),
    language: entry.language,
    kind: entry.kind,
    lesson: entry.lesson,
    title: readText(entry.title, 160, t('название занятия')),
    accuracy: readNumber(entry.accuracy, 100, t('точность')),
    speed: readNumber(entry.speed, 10000000, t('скорость')),
    duration: readNumber(entry.duration, 31536000000, t('время')),
    mistakes: readMistakes(entry.mistakes ?? {}, language),
    ...(entry.fingerMarks === undefined
      ? {}
      : { fingerMarks: readMistakes(entry.fingerMarks, language) }),
    length,
    ...(hasKeyCounts ? { presentations, errorPositions } : {}),
    ...(localDay === null ? {} : { localDay }),
    ...(entry.hintsUsed === undefined ? {} : { hintsUsed: entry.hintsUsed }),
    ...(entry.helpFlags === undefined ? {} : { helpFlags: entry.helpFlags }),
    ...(entry.exerciseKey === undefined ? {} : { exerciseKey: entry.exerciseKey }),
  };
}

function readDay(day) {
  requireValid(
    typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day),
    t('Некорректная дата проверки.'),
  );
  const parsed = new Date(`${day}T00:00:00.000Z`);
  requireValid(
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day,
    t('Некорректная дата проверки.'),
  );
  return day;
}

function readReinforcement(source, languages) {
  requireValid(isRecord(source), t('Некорректный прогресс закрепления.'));
  const result = {};
  for (const [languageId, lessons] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, languageId) && isRecord(lessons),
      t('Некорректный прогресс закрепления.'),
    );
    result[languageId] = {};
    for (const [index, check] of Object.entries(lessons)) {
      requireValid(
        /^(0|[1-9]\d*)$/.test(index) &&
          isLessonIndex(languages[languageId], Number(index)) &&
          isRecord(check),
        t('Некорректный урок закрепления.'),
      );
      const firstPassedDay = readDay(check.firstPassedDay);
      const masteredDay = check.masteredDay === null ? null : readDay(check.masteredDay);
      requireValid(
        masteredDay === null || masteredDay > firstPassedDay,
        t('Проверка закрепления должна быть в другой день.'),
      );
      result[languageId][index] = { firstPassedDay, masteredDay };
    }
  }
  return result;
}

function readProgress(source, languages, history) {
  requireValid(isRecord(source), t('Некорректный прогресс курса.'));
  const progress = {};
  for (const [languageId, records] of Object.entries(source)) {
    requireValid(
      Object.hasOwn(languages, languageId) && isRecord(records),
      t('Некорректный прогресс курса.'),
    );
    progress[languageId] = {};
    for (const [index, accuracy] of Object.entries(records)) {
      requireValid(
        /^(0|[1-9]\d*)$/.test(index) && isLessonIndex(languages[languageId], Number(index)),
        t('В прогрессе указан несуществующий урок.'),
      );
      progress[languageId][index] = readNumber(accuracy, 100, t('точность урока'));
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
    t('В файле нет профиля Ритма. Выберите JSON, скачанный из тренажёра.'),
  );
  const result = emptyProfile();
  if (source.profile !== undefined) {
    requireValid(isRecord(source.profile), t('Некорректные данные профиля.'));
    result.profile.name = readText(source.profile.name, 40, t('имя')).trim();
  }
  if (source.uiLanguage !== undefined) {
    requireValid(
      typeof source.uiLanguage === 'string' && Object.hasOwn(interfaceLanguages, source.uiLanguage),
      t('Неподдерживаемый язык интерфейса.'),
    );
    result.uiLanguage = source.uiLanguage;
  }
  result.settings = readSettings(source.settings);
  result.customLanguages = readCustomLanguages(source.customLanguages ?? {});
  const languages = { ...builtinLanguages, ...result.customLanguages };
  requireValid(Object.hasOwn(languages, source.selected), t('Выбранного языка нет в файле.'));
  result.selected = source.selected;
  result.lessons = readLessonPositions(source.lessons ?? {}, languages);
  result.retrainingKeys = readRetrainingKeys(source.retrainingKeys ?? {}, languages);
  result.fingerMarks = readFingerMarks(source.fingerMarks ?? {}, languages);
  requireValid(source.history.length <= 500, t('В файле больше 500 занятий.'));
  result.history = source.history.map((entry) => readHistoryEntry(entry, languages));
  result.progress = readProgress(source.progress ?? {}, languages, result.history);
  result.reinforcement = readReinforcement(source.reinforcement ?? {}, languages);
  for (const [languageId, lessons] of Object.entries(result.reinforcement))
    for (const index of Object.keys(lessons))
      requireValid(
        (result.progress[languageId]?.[index] ?? 0) >= 95,
        t('Закреплённый урок должен быть выполнен.'),
      );
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
