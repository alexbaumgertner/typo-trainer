import { t, getLocale, setLocale, interfaceLanguages, translateDocument } from './i18n.js';
import { html } from './ui/html.js';
import { HandMotion, handPose } from './ui/hand-motion.js';
import {
  builtinLanguages,
  fingers,
  fingerClasses,
  fingerAt,
  keyLabel as keyCap,
  keyInfo,
  lessonsFor,
  drill,
  retrainingDrill,
  homePosition,
  TypingSession,
} from './course.js';
import {
  learnedCharacters,
  keyStatistics,
  shiftStatistics,
  keyLabel,
  fingerKeys,
  handKeys,
  generateExercise,
} from './exercises.js';
import { STORAGE_KEY, emptyProfile, parseBackup, makeBackup } from './storage.js';
import { analyticsAvailable, initAnalytics, setAnalyticsEnabled, track } from './analytics.js';
import { hintLevel, refreshKeyTooltips } from './hints.js';
import {
  comparisonKey,
  exerciseKey,
  lessonState,
  localDay,
  recordLessonResult,
  recordSessionHelp,
} from './progress.js';
const $ = (s) => document.querySelector(s);
const handMotion = new HandMotion();
let handSurface = null;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
let storageAvailable = true,
  loadError = false,
  pendingImport = null,
  importRequest = 0;
let data = emptyProfile();
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) data = parseBackup(JSON.parse(raw));
} catch {
  loadError = true;
}
setLocale(data.uiLanguage);
translateDocument();
$('#interface-language').innerHTML = Object.entries(interfaceLanguages)
  .map(([id, name]) => html`<option value="${id}">${name}</option>`)
  .join('');
let languages = { ...builtinLanguages };
for (const [id, l] of Object.entries(data.customLanguages || {})) {
  if (
    l &&
    l.custom &&
    Array.isArray(l.rows) &&
    l.rows.length === 4 &&
    Array.isArray(l.shift) &&
    typeof l.text === 'string'
  )
    languages[id] = l;
}
let languageId = languages[data.selected] ? data.selected : 'ru';
let lessonIndex = Number.isInteger(data.lessons?.[languageId]) ? data.lessons[languageId] : 0;
let view = 'learn',
  tab = 'lecture',
  session = null,
  sessionKind = 'lesson',
  sessionTitle = '',
  sessionLesson = null,
  sessionIsRepeat = false,
  sessionPractice = '',
  customText = '',
  retrainingSetup = false;
let chartGroup = '';
function language() {
  return languages[languageId];
}
function lessons() {
  return lessonsFor(language());
}
function lesson() {
  return lessons()[Math.min(Math.max(0, lessonIndex), lessons().length - 1)];
}
function learned() {
  return learnedCharacters(lessons(), lessonIndex);
}
function recentKeyStats() {
  return keyStatistics(
    data.history.filter((h) => h.language === languageId),
    learned(),
  );
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
    toast(
      t('Не удалось сохранить данные. Проверьте свободное место и доступ к хранилищу браузера.'),
    );
    return false;
  }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
}
function layoutName() {
  return Object.hasOwn(builtinLanguages, languageId) ? languageId : 'custom';
}
// The movement-hint mode (auto/always/off); never anything the user typed.
function hintMode() {
  return data.settings.hintMode;
}
function reportAbandoned(options) {
  if (!session || session.status === 'done' || !session.attempts) return;
  track(
    'lesson_abandoned',
    {
      lessonId: sessionKind === 'lesson' ? sessionLesson : undefined,
      practiceType: sessionKind === 'lesson' ? undefined : sessionPractice,
      layout: layoutName(),
      hintMode: hintMode(),
      progress: Math.round((100 * session.position) / session.text.length) / 100,
    },
    options,
  );
}
function reportHintChange(setting) {
  const enabled = typeof data.settings[setting] === 'boolean' ? data.settings[setting] : undefined;
  const props = { setting, enabled, hintMode: hintMode() };
  if (setting === 'hands') track('hands_overlay_toggled', props);
  else track('hint_mode_changed', props);
}
function stopSession() {
  reportAbandoned();
  handMotion.stop();
  if (session?.status === 'running') session.pause();
  session = null;
}
function completed(id) {
  return lessonState(data, languageId, id).completed;
}
function newSession(text) {
  const created = new TypingSession(text);
  created.helpFlags = 0;
  created.hintsUsed = false;
  return created;
}
function mastered(id) {
  return lessonState(data, languageId, id).mastered;
}
function reinforcementHint(id) {
  const state = lessonState(data, languageId, id);
  if (!state.completed || state.mastered) return '';
  if (!state.firstPassedDay)
    return t(
      'Старое достижение сохранено. Для закрепления нужны две новые попытки от 95% в разные дни; вторую проведите без подсказок.',
    );
  return localDay() > state.firstPassedDay
    ? t(
        'Самостоятельную проверку можно пройти сейчас: выключите схему клавиатуры и достигните точности от 95%.',
      )
    : t(
        'Вернитесь к уроку в другой календарный день и пройдите его без подсказок с точностью от 95%.',
      );
}
function currentHelpFlags() {
  return data.settings.guidance
    ? 1 |
        (data.settings.colors ? 2 : 0) |
        (data.settings.letters ? 4 : 0) |
        (data.settings.hands ? 8 : 0) |
        (currentHintLevel() !== 'none' ? 16 : 0) |
        (currentHintLevel() === 'full' ? 32 : 0)
    : 0;
}
function recordHelp() {
  if (session) recordSessionHelp(session, currentHelpFlags());
}
function helpLabel(flags) {
  if (flags === 0) return t('без подсказок');
  return [
    t('клавиатура'),
    flags & 2 ? t('зоны') : '',
    flags & 4 ? t('буквы') : '',
    flags & 8 ? t('руки') : '',
    flags & 32 ? t('палец') : flags & 16 ? t('следующая клавиша') : '',
  ]
    .filter(Boolean)
    .join(', ');
}
function currentHintLevel() {
  return hintLevel(data.settings.hintMode, data.progress[languageId], lessons().length);
}
function sidebar() {
  $('#profile-label').textContent = data.profile.name || t('Мой профиль');
  $('#profile-avatar').textContent = Array.from(data.profile.name || t('Я'))[0].toUpperCase();
  $('#language').innerHTML = Object.entries(languages)
    .map(
      ([id, l]) =>
        html`<option value="${esc(id)}" ${id === languageId ? 'selected' : ''}>
          ${esc(l.name)} · ${esc(l.layout)}
        </option>`,
    )
    .join('');
  let section = '';
  $('#lesson-list').innerHTML = lessons()
    .map((l) => {
      let header = '';
      if (section !== l.section) {
        section = l.section;
        header = html`<div class="lesson-section">${l.section}</div>`;
      }
      return (
        header +
        html`<button
          class="lesson-button ${view === 'learn' && l.id === lessonIndex ? 'active' : ''}"
          data-lesson="${l.id}"
          title="${esc(l.title)}"
          ${view === 'learn' && l.id === lessonIndex ? 'aria-current="step"' : ''}
        >
          <span
            class="lesson-num ${mastered(l.id) ? 'mastered' : completed(l.id) ? 'done' : ''}"
            title="${mastered(l.id)
              ? t('Закреплено')
              : completed(l.id)
                ? t('Выполнено')
                : t('В процессе')}"
            >${mastered(l.id)
              ? '★'
              : completed(l.id)
                ? '✓'
                : String(l.id + 1).padStart(2, '0')}</span
          ><span>${l.title}</span
          ><span class="lesson-arrow">${view === 'learn' && l.id === lessonIndex ? '›' : ''}</span>
        </button>`
      );
    })
    .join('');
  const done = lessons().filter((l) => completed(l.id)).length;
  $('#course-count').textContent = `${done} / ${lessons().length} ${t('выполнено')}`;
  $('#course-fill').style.width = `${(100 * done) / lessons().length}%`;
  document.querySelectorAll('.nav').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
    b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false');
  });
}
function hands() {
  const home = Array.from(language().rows[2]);
  const homeKeys = [home.slice(0, 4), home.slice(6, 10)]
    .map((keys) => keys.map((key) => keyCap(language(), key)).join(' '))
    .join('     ');
  return html`<div class="hand-panel">
    <svg
      viewBox="0 0 320 135"
      role="img"
      aria-label="${t('Обе руки: пальцы над клавишами основного ряда, большие пальцы у пробела')}"
    >
      <g stroke="#c9d1e4" stroke-width="1.6" fill="#f6f8fe">
        <path
          d="M41 64L41 93Q41 123 76 123L106 123Q126 122 130 99L141 75Q143 66 135 65Q130 64 125 72L118 83L118 54L43 54Z"
        />
        <path
          d="M279 64L279 93Q279 123 244 123L214 123Q194 122 190 99L179 75Q177 66 185 65Q190 64 195 72L202 83L202 54L277 54Z"
        />
      </g>
      ${[
        [42, 40, 54, 0],
        [61, 23, 69, 1],
        [80, 15, 78, 2],
        [99, 29, 64, 3],
        [202, 29, 64, 4],
        [221, 15, 78, 5],
        [240, 23, 69, 6],
        [259, 40, 54, 7],
      ]
        .map(
          ([x, y, h, f]) =>
            html`<rect
                x="${x}"
                y="${y}"
                width="18"
                height="${h}"
                rx="9"
                fill="var(--${fingerClasses[f]})"
                stroke="#c9d1e4"
                stroke-width="1.4"
              /><text
                x="${x + 9}"
                y="${y + 17}"
                text-anchor="middle"
                font-size="9"
                fill="#6a7b96"
                font-family="Arial"
                >${esc(keyCap(language(), home[[0, 1, 2, 3, 6, 7, 8, 9][f]] || '') || '')}</text
              >`,
        )
        .join('')}
      <path
        d="M125 91L135 70M195 91L185 70"
        stroke="#aebbd2"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path d="M28 131H292" stroke="#e6eaf4" stroke-width="1" />
    </svg>
    <div class="home-keys">${esc(homeKeys)}</div>
    <span class="hand-caption">${t('Указательные пальцы — на клавишах с выступами')}</span>
  </div>`;
}
function keyMarkup(char, row, col) {
  const choosing = view === 'practice' && retrainingSetup && !session;
  const selected = (data.retrainingKeys[languageId] || []).includes(char);
  const f = fingerAt(language(), row, col),
    next = session?.text[session.position],
    info = keyInfo(language(), next || (view === 'learn' ? lesson().text[0] : ''));
  const level = currentHintLevel();
  const isNext = level !== 'none' && info?.row === row && info?.col === col;
  const classes = `key ${fingerClasses[f]} ${row === 2 && [3, 6].includes(col) ? 'home' : ''} ${isNext ? 'next' : ''} ${choosing && selected ? 'selected' : ''}`;
  const label = html`<span class="shift-label"
      >${esc(
        language().shift[row]?.[col] === keyCap(language(), char)
          ? ''
          : language().shift[row]?.[col] || '',
      )}</span
    >${esc(keyCap(language(), char))}`;
  return choosing
    ? html`<button
        type="button"
        class="${classes}"
        data-key="${row}-${col}"
        data-retraining-key="${esc(char)}"
        aria-pressed="${selected}"
        aria-label="${esc(keyCap(language(), char))}, ${esc(t(fingers[f]))}${selected
          ? t(', выбрана')
          : ''}"
        title="${esc(char)} · ${esc(t(fingers[f]))}"
      >
        ${label}
      </button>`
    : html`<div
        class="${classes}"
        data-key="${row}-${col}"
        title="${esc(char)}${level === 'full' ? ` · ${esc(t(fingers[f]))}` : ''}"
      >
        ${label}
      </div>`;
}
function keyboard() {
  return html`<section
    class="keyboard-card"
    aria-label="${t('Подсказка клавиатуры')}"
    ${session && !data.settings.guidance ? 'hidden' : ''}
  >
    <div class="keyboard-heading">
      <h2>${t('Клавиатура ·')} ${esc(language().layout)}</h2>
      <div class="keyboard-options">
        <button class="text-button" data-action="hand-demo">${t('Показать движение')}</button>
        <label class="check-label hint-mode-label" for="hint-mode"
          >${t('Подсказки')}
          <select id="hint-mode" aria-label="${t('Режим подсказок')}">
            ${[
              ['auto', t('Авто')],
              ['always', t('Всегда')],
              ['off', t('Выкл.')],
            ]
              .map(
                ([value, label]) =>
                  html`<option
                    value="${value}"
                    ${data.settings.hintMode === value ? 'selected' : ''}
                  >
                    ${label}
                  </option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="check-label"
          ><input id="hands" type="checkbox" ${data.settings.hands ? 'checked' : ''} />${t(
            'Показать руки',
          )}</label
        ><label class="check-label"
          ><input id="colors" type="checkbox" ${data.settings.colors ? 'checked' : ''} />${t(
            'Зоны пальцев',
          )}</label
        ><label class="check-label"
          ><input id="letters" type="checkbox" ${data.settings.letters ? 'checked' : ''} />${t(
            'Буквы на клавишах',
          )}</label
        >
      </div>
    </div>
    <div class="keyboard-scroll">
      <div
        class="keyboard ${data.settings.colors ? 'colored' : ''} ${data.settings.letters
          ? ''
          : 'no-letters'}"
      >
        <div class="key-row">
          ${Array.from(language().rows[0])
            .map((c, i) => keyMarkup(c, 0, i))
            .join('')}
          <div class="key special" style="flex-grow:1.7">⌫</div>
        </div>
        <div class="key-row">
          <div class="key special">Tab</div>
          ${Array.from(language().rows[1])
            .map((c, i) => keyMarkup(c, 1, i))
            .join('')}
        </div>
        <div class="key-row">
          <div class="key special" style="flex-grow:1.8">Caps Lock</div>
          ${Array.from(language().rows[2])
            .map((c, i) => keyMarkup(c, 2, i))
            .join('')}
          <div class="key special" style="flex-grow:1.8">Enter</div>
        </div>
        <div class="key-row">
          <div class="key special" id="shift-left" style="flex-grow:2.2">Shift</div>
          ${Array.from(language().rows[3])
            .map((c, i) => keyMarkup(c, 3, i))
            .join('')}
          <div class="key special" id="shift-right" style="flex-grow:2.2">Shift</div>
        </div>
        <div class="key-row">
          <div class="key special">Ctrl</div>
          <div class="key special">Alt</div>
          <div class="key space" id="space-key">${t('Пробел')}</div>
          <div class="key special">Alt</div>
          <div class="key special">Ctrl</div>
        </div>
        <svg
          id="keyboard-hands"
          class="keyboard-hands"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="${t('Положение рук над клавиатурой')}"
          hidden
        ></svg>
      </div>
    </div>
    <div class="finger-legend">
      ${['pinky', 'ring', 'middle', 'index']
        .map(
          (c, i) =>
            html`<span
              ><i class="legend-dot" style="background:var(--${c})"></i>${[
                t('Мизинец'),
                t('Безымянный'),
                t('Средний'),
                t('Указательный'),
              ][i]}</span
            >`,
        )
        .join('')}
    </div>
    <div class="finger-help">
      <p id="finger-hint">
        <span class="hint-symbol">→</span> <strong>${t('Каждому пальцу — своя зона.')}</strong>
      </p>
      <p id="hint-explanation"></p>
    </div>
  </section>`;
}
function basics() {
  const h = Array.from(language().rows[2]);
  return html`<div class="basics-content">
    <h3>${t('1. Найдите исходную позицию без взгляда на клавиатуру')}</h3>
    <p>
      ${t('Проведите указательными пальцами по среднему ряду: на клавишах')}
      <strong>${esc(keyCap(language(), h[3]))} ${t('и')} ${esc(keyCap(language(), h[6]))}</strong>
      ${t(
        'находятся небольшие выступы. Положите на них указательные пальцы. Затем расположите остальные пальцы на соседних клавишах. Пальцы слегка согнуты, кисти продолжают линию предплечий.',
      )}
    </p>
    <table class="finger-table">
      <thead>
        <tr>
          <th>${t('Палец')}</th>
          <th>${t('Левая рука')}</th>
          <th>${t('Правая рука')}</th>
        </tr>
      </thead>
      <tbody>
        ${[t('Мизинец'), t('Безымянный'), t('Средний'), t('Указательный')]
          .map(
            (f, i) =>
              html`<tr>
                <td>${f}</td>
                <td>${esc(keyCap(language(), h[i]))}</td>
                <td>${esc(keyCap(language(), h[9 - i]))}</td>
              </tr>`,
          )
          .join('')}
        <tr>
          <td>${t('Большой')}</td>
          <td colspan="2">${t('Пробел — удобным большим пальцем')}</td>
        </tr>
      </tbody>
    </table>
    <h3>${t('2. Двигайте нужный палец и возвращайте его домой')}</h3>
    <p>
      ${t(
        'Цвет на клавиатуре показывает зону пальца. Указательные обслуживают две колонки, остальные пальцы — свои зоны. Нажмите клавишу легко и верните палец на исходную клавишу. Оставляйте остальные пальцы рядом с основным рядом, не зажимайте кисти. Для дальних клавиш допустимо небольшое движение руки.',
      )}
    </p>
    <h3>${t('3. Положение тела и техника')}</h3>
    <p>
      ${t(
        'Сядьте удобно, с опорой для спины и стоп. Расслабьте плечи; локти держите близко к телу, предплечья — примерно горизонтально. Клавиатура должна быть перед вами. Во время печати не переносите вес на запястья. Смотрите на экран; если забыли положение рук, найдите выступы наощупь. При дискомфорте остановитесь и измените положение.',
      )}
    </p>
    <h3>${t('4. Shift, пробел и исправления')}</h3>
    <p>
      ${t(
        'Пробел нажимайте большим пальцем. Для заглавной буквы удерживайте Shift мизинцем противоположной руки. Например, для буквы',
      )}
      ${esc(keyCap(language(), h[0]))}
      ${t(
        'используйте правый Shift. После буквы отпустите Shift. В тренажёре ошибка останавливает курсор: нажмите Backspace и введите нужный символ. Исправление не убирает ошибку из статистики точности.',
      )}
    </p>
    <h3>${t('5. Как строить занятия')}</h3>
    <p>
      ${t(
        'Начните с 10–15 минут в день: повторите прошлый урок, выполните новый и потренируйте трудные клавиши. Цель курса — не менее 95% точности; это выбранный ориентир тренажёра, а не универсальная норма. Уроки можно открыть в любом порядке, но новичку полезно двигаться последовательно. При усталости сделайте перерыв, а скорость увеличивайте постепенно.',
      )}
    </p>
    <p class="sources">
      ${t('Принципы постановки рук и техники:')}
      <a href="https://www.ratatype.com/learn/" target="_blank" rel="noopener">Ratatype</a>${t(
        '. Подход к повторению уроков и визуальным подсказкам:',
      )} <a href="https://www.typingclub.com/" target="_blank" rel="noopener">TypingClub</a>${t(
        '. Упражнения и лекции написаны для этого курса.',
      )}
    </p>
  </div>`;
}
function learnPage() {
  const l = lesson();
  return html`<div class="breadcrumb">
      ${t('Обучение')} <span>›</span> ${esc(language().name)} <span>›</span
      ><span class="current">${t('Урок')} ${l.id + 1}</span>
    </div>
    <div class="page-heading">
      <div>
        <p class="eyebrow">
          ${t('ШАГ')} ${String(l.id + 1).padStart(2, '0')} ${t('ИЗ')} ${lessons().length}
        </p>
        <h1>${l.title}</h1>
      </div>
      <span class="badge"
        ><i></i>${l.id === 0 ? t('Начинаем с нуля') : t('Точность прежде скорости')}</span
      >
    </div>
    <p class="subtitle">
      ${l.id === 0
        ? t('Познакомьтесь с клавиатурой. Найдите опору для каждого пальца.')
        : t('Новые движения, немного теории и спокойная практика.')}
    </p>
    <p class="progress-explainer">
      <strong
        >${mastered(l.id)
          ? t('Закреплено ★')
          : completed(l.id)
            ? t('Выполнено ✓')
            : t('В процессе')}</strong
      >
      ${t(
        '· «Выполнено» — точность от 95% в одной попытке. «Закреплено» — ещё одна попытка от 95% без подсказок в другой календарный день. Это ориентиры курса, не научно установленные пороги.',
      )}
      ${reinforcementHint(l.id)}
    </p>
    <div class="lesson-tabs">
      <button class="lesson-tab ${tab === 'lecture' ? 'active' : ''}" data-tab="lecture">
        <span class="tab-dot">1</span>${t('Небольшая лекция')}</button
      ><button class="lesson-tab ${tab === 'training' ? 'active' : ''}" data-tab="training">
        <span class="tab-dot">2</span>${t('Практика')}
      </button>
    </div>
    <p class="mobile-note">
      ${t(
        'Для обучения десятью пальцами подключите физическую клавиатуру. На телефоне можно читать лекции.',
      )}
    </p>
    ${tab === 'lecture'
      ? html`<section class="lecture-card">
          <div class="lecture-copy">
            <div class="small-label">${t('ПЕРЕД ПЕРВЫМ НАЖАТИЕМ')}</div>
            <h2>${l.id === 0 ? t('Ваши пальцы уже знают, где начать') : l.title}</h2>
            <p>${esc(l.focus)}</p>
            ${l.keys
              ? html`<div class="key-pills">
                  ${Array.from(l.keys)
                    .slice(0, 14)
                    .map((c) => html`<span class="key-pill">${esc(keyCap(language(), c))}</span>`)
                    .join('')}
                </div>`
              : ''}${l.keys
              ? html`<p class="finger-assignment">
                  ${[...new Set(Array.from(l.keys).map((c) => keyInfo(language(), c)?.finger))]
                    .filter((f) => f !== undefined)
                    .map(
                      (f) =>
                        html`<span
                          ><strong>${t(fingers[f])}:</strong> ${Array.from(l.keys)
                            .filter((c) => keyInfo(language(), c)?.finger === f)
                            .map((c) => esc(keyCap(language(), c)))
                            .join(' ')}</span
                        >`,
                    )
                    .join('')}
                </p>`
              : ''}
            <div class="lecture-actions">
              <button class="primary" data-action="start-lesson">
                ${t('Начать практику')} <span>→</span></button
              ><span class="reading-time">${t('около 2 минут')}</span>
            </div>
          </div>
          ${hands()}
        </section>`
      : trainingMarkup()}${keyboard()}${tab === 'lecture'
      ? html`<div class="foundation">
          <div class="foundation-item">
            <span class="foundation-icon">◎</span>
            <div>
              <h3>${t('Смотрите на экран')}</h3>
              <p>
                ${t('Нащупайте выступы на клавишах.')}<br />${t('Клавиатура подскажет движение.')}
              </p>
            </div>
          </div>
          <div class="foundation-item">
            <span class="foundation-icon">⌁</span>
            <div>
              <h3>${t('Сначала точность')}</h3>
              <p>${t('Не спешите. Ровный ритм важнее')}<br />${t('количества нажатий.')}</p>
            </div>
          </div>
          <div class="foundation-item">
            <span class="foundation-icon">↶</span>
            <div>
              <h3>${t('Возвращайтесь домой')}</h3>
              <p>${t('После нажатия пальцы снова')}<br />${t('над основным рядом.')}</p>
            </div>
          </div>
        </div>`
      : ''}
    <details class="basics" ${l.id === 0 && tab === 'lecture' ? 'open' : ''}>
      <summary>${t('Постановка пальцев и техника · подробная инструкция')}</summary>
      ${basics()}
    </details>`;
}
function trainingMarkup() {
  if (!session) prepareLessonSession();
  return html`<div class="stats-strip">
      <div class="live-stat">
        <span>${t('СКОРОСТЬ')}</span><b id="live-speed">${data.settings.hideSpeed ? '—' : '0'}</b
        ><small>${t('зн/мин')}</small>
      </div>
      <div class="live-stat"><span>${t('ТОЧНОСТЬ')}</span><b id="live-accuracy">100%</b></div>
      <div class="live-stat"><span>${t('ВРЕМЯ')}</span><b id="live-time">0:00</b></div>
      <div class="live-stat">
        ${sessionKind === 'retraining'
          ? html`<span>${t('ДРУГИМ ПАЛЬЦЕМ')}</span><b id="live-finger-marks">0</b
              ><small>${t('самопроверка')}</small>`
          : html`<span>${t('ЦЕЛЬ')}</span><b>95%</b><small>${t('точности')}</small>`}
      </div>
    </div>
    <div class="training-options">
      <label class="check-label"
        ><input id="hide-speed" type="checkbox" ${data.settings.hideSpeed ? 'checked' : ''} />${t(
          'Скрыть скорость во время набора',
        )}</label
      >
      <label class="check-label"
        ><input id="guidance" type="checkbox" ${data.settings.guidance ? 'checked' : ''} />${t(
          'Показывать подсказки клавиатуры',
        )}</label
      >
    </div>
    <section class="typing-card">
      <div class="typing-top">
        <b>${esc(sessionTitle || lesson().title)}</b
        ><span id="typing-count">0 / ${session.text.length} ${t('символов')}</span>
      </div>
      <div
        class="typing-text"
        id="typing-text"
        tabindex="0"
        role="button"
        aria-label="${t('Сфокусировать поле набора')}"
      ></div>
      <textarea
        id="typing-input"
        class="typing-input"
        aria-label="${t('Поле набора: повторяйте текст упражнения')}"
        aria-describedby="typing-feedback"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      ></textarea>
      <div class="typing-message">
        <span id="typing-feedback" role="status"
          >${t('Нажмите «Начать», затем печатайте текст выше.')}</span
        >${sessionKind === 'retraining'
          ? html`<button class="secondary" data-action="mark-finger" aria-keyshortcuts="F2">
              ${t('Нажал другим пальцем · F2')}
            </button>`
          : ''}<button class="text-button" data-action="pause" id="pause-button">
          ${t('Начать →')}
        </button>
      </div>
      <div id="pause-cover"></div>
    </section>`;
}
function retrainingSetupMarkup() {
  const keys = data.retrainingKeys[languageId] || [];
  const homes = [0, 1, 2, 3, 6, 7, 8, 9].map((col) => language().rows[2][col]);
  return html`<section class="practice-form retraining-setup">
      <h2>${t('Переучиваюсь')}</h2>
      <p>
        ${t(
          'Выберите до 8 проблемных клавиш на клавиатуре ниже. Каждая кнопка показывает назначенные руку и палец; повторное нажатие снимает выбор. Для каждой клавиши упражнение добавит возвращение в исходную позицию.',
        )}
      </p>
      <p class="form-note">
        ${t(
          'Браузер не видит, каким пальцем вы нажали клавишу. Отмечайте привычное движение сами кнопкой или клавишей F2 во время набора.',
        )}
      </p>
      <div id="retraining-selection" aria-live="polite">
        ${keys.length
          ? html`<ul class="retraining-keys">
              ${keys
                .map((key) => {
                  const finger = keyInfo(language(), key).finger;
                  return html`<li>
                    <strong>${esc(keyCap(language(), key))}</strong> · ${esc(t(fingers[finger]))}
                    ${t('· исходная')} ${esc(keyCap(language(), homes[finger]))}
                  </li>`;
                })
                .join('')}
            </ul>`
          : html`<p>${t('Пока не выбрана ни одна клавиша.')}</p>`}
      </div>
      <button class="primary" data-action="start-retraining" ${keys.length ? '' : 'disabled'}>
        ${t('Начать короткое упражнение →')}
      </button>
      <button class="text-button" data-action="retraining-close">
        ${t('Другие виды практики')}
      </button>
    </section>
    ${keyboard()}`;
}
function practicePage() {
  const stats = recentKeyStats(),
    difficult = stats.filter((stat) => stat.difficult).sort((a, b) => b.lower - a.lower),
    insufficient = stats.filter((stat) => !stat.sufficient).length,
    shifts = shiftStatistics(language(), stats);
  const shiftResult = (side) =>
    shifts[side].shown >= 12
      ? `${Math.round((100 * shifts[side].errors) / shifts[side].shown)}% (${shifts[side].errors}/${shifts[side].shown})`
      : `${t('недостаточно данных (')}${shifts[side].shown}/12)`;
  return html`<div class="breadcrumb">
      ${t('Практика')} <span>›</span><span class="current">${esc(language().name)}</span>
    </div>
    <div class="page-heading">
      <div>
        <p class="eyebrow">${t('В ВАШЕМ ТЕМПЕ')}</p>
        <h1>${t('Больше практики, меньше ошибок')}</h1>
      </div>
      <button class="secondary" data-action="add-language">${t('+ Добавить язык')}</button>
    </div>
    <p class="subtitle">
      ${t(
        'Повторите изученные клавиши, выберите палец или руку либо потренируйтесь на своём тексте.',
      )}
    </p>
    ${session
      ? html`${sessionKind === 'retraining'
            ? html`<p class="form-note">
                ${t(
                  'Самопроверка: нажмите F2 сразу после клавиши, которую нажали не тем пальцем. Занятие остановится и предложит повторить сочетание.',
                )}
              </p>`
            : ''}${trainingMarkup()}${keyboard()}
          <div class="row-actions">
            <button
              class="secondary"
              data-action="${sessionKind === 'retraining' ? 'retraining-open' : 'new-practice'}"
            >
              ${sessionKind === 'retraining' ? t('Выбрать клавиши') : t('Выбрать другой текст')}</button
            ><button class="text-button" data-action="repeat">${t('Начать заново')}</button>
          </div>`
      : retrainingSetup
        ? retrainingSetupMarkup()
        : html`<div class="choice-grid">
              <button class="choice" data-action="practice-sample">
                <strong>${t('Текст для разминки ↗')}</strong
                ><span>${t('Текст для практики ·')} ${esc(language().name)}</span></button
              ><button class="choice" data-action="practice-weak">
                <strong>${t('Трудные клавиши ↗')}</strong
                ><span>${t('По доле ошибок за последние 10 занятий с полной статистикой')}</span>
              </button>
              <button class="choice" data-action="retraining-open">
                <strong>${t('Переучиваюсь ↗')}</strong
                ><span>${t('Выберите клавиши и проверяйте, каким пальцем их нажимаете')}</span>
              </button>
            </div>
            <section class="practice-form">
              <h2>${t('Точечная практика')}</h2>
              <p class="form-note">
                ${t(
                  'Используются клавиши до выбранного урока включительно. Для повторения укажите тот же seed и тот же выбор. Для трудных клавиш можно повторить точный набор символов.',
                )}
              </p>
              <form id="exercise-form">
                <div class="exercise-fields">
                  <label class="field"
                    >${t('Палец')}
                    <select name="finger">
                      ${fingers
                        .map(
                          (name, i) =>
                            html`<option value="${i}">
                              ${t(name)}${i === 8 ? t('(пробел)') : ''}
                            </option>`,
                        )
                        .join('')}
                    </select>
                  </label>
                  <label class="field"
                    >${t('Второй палец')}
                    <select name="otherFinger">
                      ${fingers
                        .map(
                          (name, i) =>
                            html`<option value="${i}" ${i === 4 ? 'selected' : ''}>
                              ${t(name)}${i === 8 ? t('(пробел)') : ''}
                            </option>`,
                        )
                        .join('')}
                    </select>
                  </label>
                  <label class="field"
                    >${t('Рука')}
                    <select name="hand">
                      <option value="left">${t('Левая')}</option>
                      <option value="right">${t('Правая')}</option>
                    </select>
                  </label>
                  <label class="field"
                    >${t('Seed для повтора')}
                    <input name="seed" maxlength="60" placeholder="${t('Случайный, если пусто')}" />
                  </label>
                  <label class="field"
                    >${t('Клавиши для точного повтора')}
                    <input name="keys" maxlength="20" placeholder="${t('Например: аА')} " />
                  </label>
                </div>
                <p id="exercise-error" class="form-error" role="alert"></p>
                <div class="row-actions">
                  <button class="secondary" name="mode" value="finger">
                    ${t('Выбранный палец')}
                  </button>
                  <button class="secondary" name="mode" value="fingers">
                    ${t('Чередовать пальцы')}
                  </button>
                  <button class="secondary" name="mode" value="hand">${t('Выбранная рука')}</button>
                  <button class="secondary" name="mode" value="hands">
                    ${t('Чередовать руки')}
                  </button>
                  <button class="secondary" name="mode" value="keys">
                    ${t('Указанные клавиши')}
                  </button>
                </div>
              </form>
            </section>
            <section class="practice-form">
              <h2>${t('Трудные клавиши')}</h2>
              <p class="form-note">
                ${difficult.length
                  ? difficult
                      .slice(0, 6)
                      .map(
                        (stat) =>
                          `${esc(keyLabel(language(), stat.char))}: ${Math.round(stat.rate * 100)}% (${stat.errors}/${stat.shown})`,
                      )
                      .join(' · ')
                  : t('Пока нет клавиш с высокой долей ошибок.')}
                ${insufficient
                  ? `${t('Недостаточно данных для')} ${insufficient} ${t('изученных клавиш: нужно не менее 12 предъявлений каждой.')}`
                  : ''}
                ${t('Пробел и регистр учитываются отдельно. Символы с левым Shift:')}
                ${shiftResult('left')}${t('; с правым Shift:')}
                ${shiftResult('right')}${t(
                  '. Это ошибки при наборе символов с Shift; нельзя установить, была ли ошибка именно в физической клавише Shift.',
                )}
              </p>
            </section>
            <form id="practice-form" class="practice-form">
              <label class="field"
                >${t('Ваш текст')}<textarea
                  id="custom-text"
                  maxlength="3000"
                  placeholder="${t('Вставьте текст, который хотите научиться печатать…')}"
                >
${esc(customText)}</textarea
                >
              </label>
              <p class="form-note">
                ${t(
                  'До 3000 символов. Переносы строк будут заменены пробелами. Выберите раскладку',
                )}
                ${esc(language().layout)} ${t('в операционной системе.')}
              </p>
              <p id="practice-error" class="form-error" role="alert"></p>
              <button class="primary" type="submit">
                ${t('Начать тренировку')} <span>→</span>
              </button>
            </form>
            ${keyboard()}`}`;
}
function progressPage() {
  const history = data.history.filter((h) => h.language === languageId),
    passed = lessons().filter((l) => completed(l.id)).length,
    secured = lessons().filter((l) => mastered(l.id)).length,
    total = history.reduce((n, h) => n + h.duration, 0),
    groups = [...new Set(history.map(comparisonKey).filter(Boolean))];
  if (!groups.includes(chartGroup)) chartGroup = groups.at(-1) ?? '';
  const comparison = history.filter((h) => comparisonKey(h) === chartGroup).slice(-10),
    best = Math.max(0, ...comparison.map((h) => h.speed));
  return html`<div class="breadcrumb">
      ${t('Мой прогресс')} <span>›</span><span class="current">${esc(language().name)}</span>
    </div>
    <p class="eyebrow">${t('КАЖДОЕ НАЖАТИЕ — ШАГ ВПЕРЁД')}</p>
    <h1>${t('Ваш ритм становится увереннее')}</h1>
    <p class="subtitle">${t('Результаты завершённых занятий для выбранного языка.')}</p>
    <p class="progress-explainer">
      ${t(
        '«Выполнено» — одна попытка с точностью от 95%. «Закреплено» — повторная попытка от 95% без подсказок в другой календарный день. Старые выполненные уроки сохранены; если у старой попытки нет даты или данных о подсказках, для закрепления нужны две новые проверки в разные дни. Пороги — ориентиры курса.',
      )}
    </p>
    <div class="progress-cards">
      <div class="progress-card">
        <span>${t('Выполнено')}</span><b>${passed} <small>/ ${lessons().length}</small></b
        ><small>${t('Точность от 95%')}</small>
      </div>
      <div class="progress-card">
        <span>${t('Закреплено')}</span><b>${secured} <small>/ ${lessons().length}</small></b
        ><small>${t('Повтор без подсказок в другой день')}</small>
      </div>
      <div class="progress-card">
        <span>${t('Время практики')}</span
        ><b>${Math.round(total / 60000)} <small>${t('мин')}</small></b
        ><small>${history.length} ${t('завершённых занятий')}</small>
      </div>
    </div>
    <section class="history-card">
      <h2>${t('История занятий')}</h2>
      ${history.length
        ? html`${groups.length
              ? html`<label class="field chart-picker"
                  >${t('Сравнение скорости')}
                  <select id="chart-group">
                    ${groups
                      .map((key) => {
                        const [id, exercise, flags] = key.split(':');
                        return html`<option value="${key}" ${key === chartGroup ? 'selected' : ''}>
                          ${t('Урок')} ${Number(id) + 1} ${t('· текст')} ${exercise.slice(-4)} ·
                          ${helpLabel(Number(flags))}
                        </option>`;
                      })
                      .join('')}
                  </select>
                </label>`
              : ''}
            ${comparison.length
              ? html`<div
                  class="history-chart"
                  role="img"
                  aria-label="${t('Скорость сопоставимых занятий:')} ${comparison
                    .map((h) => h.speed)
                    .join(', ')} ${t('знаков в минуту')}"
                >
                  ${comparison
                    .map(
                      (h) =>
                        html`<div
                          class="chart-column"
                          style="height:${Math.max(3, (h.speed / Math.max(best, 1)) * 100)}%"
                        >
                          <span>${h.speed}</span>
                        </div>`,
                    )
                    .join('')}
                </div>`
              : html`<p class="form-note">
                  ${t(
                    'Для сравнения скорости завершите урок. Старые занятия без сведений о подсказках и тексте не включены в график.',
                  )}
                </p>`}
            <p class="chart-caption">
              ${t(
                'Последние 10 попыток одного текста урока с одинаковым режимом подсказок · знаков в минуту. Разные упражнения и условия помощи не смешиваются.',
              )}
            </p>
            <div style="overflow:auto">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>${t('Дата')}</th>
                    <th>${t('Занятие')}</th>
                    <th>${t('Скорость')}</th>
                    <th>${t('Точность')}</th>
                    <th>${t('Подсказки')}</th>
                    <th>${t('Другим пальцем')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${history
                    .slice(-15)
                    .reverse()
                    .map(
                      (h) =>
                        html`<tr>
                          <td>
                            ${new Intl.DateTimeFormat(getLocale(), {
                              day: '2-digit',
                              month: 'short',
                            }).format(new Date(h.date))}
                          </td>
                          <td>
                            ${esc(
                              h.kind === 'lesson'
                                ? lessonsFor(language())[h.lesson].title
                                : h.title,
                            )}
                          </td>
                          <td>${h.speed} ${t('зн/мин')}</td>
                          <td style="color:${h.accuracy >= 95 ? '#509c87' : '#bf8b64'}">
                            ${h.accuracy}%
                          </td>
                          <td>
                            ${h.helpFlags !== undefined
                              ? helpLabel(h.helpFlags)
                              : h.hintsUsed === undefined
                                ? t('Нет данных')
                                : h.hintsUsed
                                  ? t('Да')
                                  : t('Нет')}
                          </td>
                          <td>
                            ${h.kind !== 'retraining' || h.fingerMarks === undefined
                              ? t('Нет данных')
                              : Object.values(h.fingerMarks).reduce((sum, n) => sum + n, 0)}
                          </td>
                        </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
        : html`<div class="empty-state">
            <span class="result-icon">⌁</span>
            <h2>${t('Здесь появится ваша история')}</h2>
            <p>${t('Завершите первый урок — сохраним точность, скорость и трудные клавиши.')}</p>
            <button class="primary" data-action="go-learn">${t('Перейти к урокам →')}</button>
          </div>`}
    </section>
    <div class="row-actions">
      <button class="secondary" data-action="profile">${t('Профиль и перенос данных')}</button
      ><button class="text-button" data-action="reset-progress">${t('Сбросить историю')}</button>
    </div>
    <p class="form-note">
      ${t(
        'Данные хранятся только в этом браузере. Чтобы продолжить в другом браузере, скачайте файл профиля и примените его там.',
      )}
    </p>
    ${storageAvailable
      ? ''
      : html`<p class="storage-note">${t('Сохранение в браузере недоступно.')}</p>`}`;
}
function render() {
  translateDocument();
  $('#interface-language').value = data.uiLanguage;
  sidebar();
  $('#main').innerHTML =
    view === 'learn' ? learnPage() : view === 'practice' ? practicePage() : progressPage();
  if (session && $('#typing-text')) {
    renderTyping();
    bindInput();
  }
  updateKeyboard();
  bindSettings();
  $('#chart-group')?.addEventListener('change', (event) => {
    chartGroup = event.target.value;
    render();
  });
  $('#hide-speed')?.addEventListener('change', (event) => {
    data.settings.hideSpeed = event.target.checked;
    save();
    updateClock();
    if (session?.status === 'running') $('#typing-input')?.focus({ preventScroll: true });
  });
  $('#guidance')?.addEventListener('change', (event) => {
    data.settings.guidance = event.target.checked;
    recordHelp();
    reportHintChange('guidance');
    $('.keyboard-card')?.toggleAttribute('hidden', !event.target.checked);
    save();
    if (session?.status === 'running') $('#typing-input')?.focus({ preventScroll: true });
  });
}
function bindSettings() {
  $('#hint-mode')?.addEventListener('change', (event) => {
    data.settings.hintMode = event.target.value;
    recordHelp();
    save();
    reportHintChange('hintMode');
    updateKeyboard();
  });
  for (const setting of ['colors', 'letters', 'hands'])
    $(`#${setting}`)?.addEventListener('change', (e) => {
      data.settings[setting] = e.target.checked;
      recordHelp();
      save();
      reportHintChange(setting);
      if (setting === 'hands') {
        updateKeyboard();
        return;
      }
      $('.keyboard')?.classList.toggle(
        setting === 'colors' ? 'colored' : 'no-letters',
        setting === 'colors' ? e.target.checked : !e.target.checked,
      );
    });
}
function renderTyping(handOptions = {}) {
  if (!session || !$('#typing-text')) return;
  $('#typing-text').innerHTML = Array.from(session.text)
    .map(
      (c, i) =>
        html`<span
          class="char ${i < session.position
            ? 'completed'
            : i === session.position
              ? `cursor ${session.wrong ? 'error' : ''}`
              : ''}"
          ${i === session.position ? 'id="cursor"' : ''}
          >${c === ' ' && i === session.position ? '␣' : esc(c)}</span
        >`,
    )
    .join('');
  const cursor = $('#cursor');
  if (cursor) {
    const box = $('#typing-text');
    if (
      cursor.offsetTop < box.scrollTop ||
      cursor.offsetTop + cursor.offsetHeight > box.scrollTop + box.clientHeight
    )
      box.scrollTop = cursor.offsetTop - 40;
  }
  $('#typing-count').textContent = `${session.position} / ${session.text.length} ${t('символов')}`;
  $('#live-accuracy').textContent = `${session.accuracy()}%`;
  if ($('#live-finger-marks'))
    $('#live-finger-marks').textContent = Object.values(session.fingerMarks).reduce(
      (sum, n) => sum + n,
      0,
    );
  $('#pause-button').textContent =
    session.status === 'running'
      ? t('Пауза · Esc')
      : session.status === 'ready'
        ? t('Начать →')
        : session.retry
          ? t('Повторить сочетание →')
          : session.status === 'done'
            ? t('Повторить →')
            : t('Продолжить →');
  let feedback = session.wrong
    ? t('Ошибка. Нажмите Backspace и попробуйте ещё раз.')
    : session.retry
      ? `${t('Отметили «')}${keyCap(language(), session.retry.key)}${t('»: проверьте исходную позицию и повторите «')}${keyCap(language(), session.retry.combo)}».`
      : session.status === 'running'
        ? t('Печатайте в своём темпе. Смотрите на экран.')
        : session.status === 'paused'
          ? t('Пауза. Время остановлено.')
          : t('Нажмите «Начать», затем печатайте текст выше.');
  if (session.wrong && /[a-z]/i.test(session.lastWrong || '') && languageId === 'ru')
    feedback += ' ' + t('Проверьте русскую раскладку.');
  if (session.wrong && /[а-яё]/i.test(session.lastWrong || '') && languageId === 'en')
    feedback += ' ' + t('Проверьте английскую раскладку.');
  $('#typing-feedback').textContent = feedback;
  $('#typing-feedback').parentElement.classList.toggle('error', session.wrong);
  const homeKeys = keyCap(language(), homePosition(language())).split(' ');
  $('#pause-cover').innerHTML =
    session.status === 'paused'
      ? session.retry
        ? html`<div class="pause-cover" role="status">
            <strong>${t('Вернитесь в исходную позицию')}</strong
            ><span
              >${t('Левая рука:')} ${esc(homeKeys.slice(0, 4).join(' '))} ${t('· Правая рука:')}
              ${esc(homeKeys.slice(4).join(' '))}</span
            ><span
              >${t('Клавиша')} ${esc(keyCap(language(), session.retry.key))}:
              ${esc(t(fingers[keyInfo(language(), session.retry.key).finger]))}</span
            ><span
              >${t('Повторите сочетание:')}
              <strong>${esc(keyCap(language(), session.retry.combo))}</strong></span
            ><button class="primary" data-action="pause">${t('Повторить сочетание →')}</button>
          </div>`
        : html`<div class="pause-cover">
            <strong>${t('Небольшая пауза')}</strong
            ><button class="primary" data-action="pause">${t('Продолжить →')}</button>
          </div>`
      : '';
  updateClock();
  updateKeyboard(handOptions);
}
function updateClock() {
  if (!session || !$('#live-time')) return;
  const seconds = Math.floor(session.time() / 1000);
  $('#live-time').textContent =
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('#live-speed').textContent = data.settings.hideSpeed
    ? '—'
    : session.attempts
      ? session.speed()
      : 0;
}
setInterval(updateClock, 500);
function updateKeyboard(handOptions = {}) {
  const expected = session
      ? ['paused', 'done'].includes(session.status)
        ? ''
        : session.text[session.position]
      : view === 'learn'
        ? lesson().text[0]
        : '',
    info = keyInfo(language(), expected || ''),
    level = currentHintLevel();
  refreshKeyTooltips(document.querySelectorAll('.keyboard div.key[data-key]'), language(), level);
  document.querySelectorAll('.key.next, .space.next').forEach((k) => k.classList.remove('next'));
  if (info && level !== 'none') {
    $(`[data-key="${info.row}-${info.col}"]`)?.classList.add('next');
    if (info.row === 4) $('#space-key')?.classList.add('next');
    if (info.shift) $(info.finger < 4 ? '#shift-right' : '#shift-left')?.classList.add('next');
  }
  if ($('#finger-hint'))
    $('#finger-hint').innerHTML =
      info && level === 'full'
        ? html`<span class="hint-symbol">→</span>
            <strong
              >${esc(expected === ' ' ? t('Пробел') : keyCap(language(), expected || '') || '')} ·
              ${t(fingers[info.finger])}</strong
            >${info.deadKey
              ? html` ${t('· Сначала')} ${esc(info.deadKey)}${t(', затем буква')}`
              : ''}${info.shift ? ` + ${info.finger < 4 ? t('правый') : t('левый')} Shift` : ''}`
        : info && level === 'key'
          ? t('Следующая клавиша выделена на схеме.')
          : level === 'none'
            ? t('Найдите следующую клавишу по памяти.')
            : t('Каждому пальцу — своя зона.');
  if ($('#hint-explanation'))
    $('#hint-explanation').textContent =
      data.settings.hintMode === 'auto'
        ? level === 'full'
          ? t('Авто: показаны клавиша и палец. После 25% уроков останется только клавиша.')
          : level === 'key'
            ? t('Авто: показана клавиша. После 50% уроков подсказки исчезнут.')
            : t('Авто: подсказки скрыты. Их можно вернуть в меню выше.')
        : t('После нажатия возвращайтесь на основной ряд');
  updateHandOverlay(level === 'full' ? info : null, expected, handOptions);
}
function updateHandOverlay(info, expected, options) {
  const keyboard = $('.keyboard'),
    svg = $('#keyboard-hands');
  handMotion.stop();
  if (!keyboard || !svg) return;
  if (handSurface !== svg) {
    handMotion.current = null;
    handSurface = svg;
  }
  keyboard.classList.toggle('hands-visible', data.settings.hands);
  svg.toggleAttribute('hidden', !data.settings.hands);
  if (!data.settings.hands) return;
  const bounds = keyboard.getBoundingClientRect();
  const point = (selector) => {
    const element = $(selector);
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {
      x: r.left - bounds.left + r.width / 2,
      y: r.top - bounds.top + r.height / 2,
      w: r.width,
    };
  };
  const home = [0, 1, 2, 3, 6, 7, 8, 9].map((col) => point(`[data-key="2-${col}"]`));
  if (home.some((p) => !p)) return;
  const unit = home[1].x - home[0].x,
    baseY = home[0].y + unit * 1.3,
    radius = unit * 0.22;
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  svg.setAttribute(
    'aria-label',
    info
      ? `${t('Положение рук:')} ${expected === ' ' ? t('пробел') : expected}, ${t(fingers[info.finger])}${info.shift ? `, ${info.finger < 4 ? t('правый') : t('левый')} Shift` : ''}`
      : t('Исходная позиция обеих рук над клавиатурой'),
  );
  const target = info
    ? info.row === 4
      ? point('#space-key')
      : point(`[data-key="${info.row}-${info.col}"]`)
    : null;
  const shiftFinger = info?.shift ? (info.finger < 4 ? 7 : 0) : null;
  const shiftTarget = info?.shift ? point(info.finger < 4 ? '#shift-right' : '#shift-left') : null;
  const finger = (root, tip, f, active, rootY) =>
    html`<g
      class="overlay-finger ${fingerClasses[f]} ${active ? 'active' : ''}"
      data-hand-finger="${f}"
      ><path
        d="M ${root.x - radius} ${rootY} C ${root.x - radius} ${rootY - unit * 0.6}, ${tip.x -
        radius} ${tip.y + unit * 0.45}, ${tip.x - radius} ${tip.y} Q ${tip.x - radius} ${tip.y -
        radius}, ${tip.x} ${tip.y - radius} Q ${tip.x + radius} ${tip.y - radius}, ${tip.x +
        radius} ${tip.y} C ${tip.x + radius} ${tip.y + unit * 0.45}, ${root.x + radius} ${rootY -
        unit * 0.6}, ${root.x + radius} ${rootY} Z"
      />${active
        ? html`<circle
            cx="${tip.x}"
            cy="${tip.y - radius * 0.6}"
            r="${radius * 0.23}"
            class="finger-tip"
          />`
        : ''}</g
    >`;
  const space = point('#space-key');
  const thumbs = [
    { x: Math.max(home[4].x - radius - unit * 0.85, space.x + unit * 0.55), y: space.y },
    { x: Math.min(home[3].x + radius + unit * 0.85, space.x - unit * 0.55), y: space.y },
  ];
  const resting = handPose(home, null, null, null, thumbs, unit);
  const destination = handPose(
    home,
    info?.finger === 8 ? thumbs[0] : target,
    info,
    shiftTarget,
    thumbs,
    unit,
  );
  const draw = (pose) => {
    if (!svg.isConnected) {
      handMotion.stop();
      return;
    }
    let markup = '';
    for (const side of [0, 1]) {
      const offset = pose.palms[side],
        palmY = baseY + offset.y;
      const indices = side === 0 ? [0, 1, 2, 3] : [4, 5, 6, 7],
        left = home[indices[0]].x - radius + offset.x,
        right = home[indices[3]].x + radius + offset.x,
        sign = side === 0 ? 1 : -1,
        inner = side === 0 ? right : left,
        wristY = palmY + unit * 1.35;
      let hand = html`<path
        class="overlay-palm"
        d="M ${left} ${palmY - 10} Q ${(left + right) / 2} ${palmY - 18} ${right} ${palmY -
        10} L ${right} ${palmY + unit * 0.45} Q ${right} ${palmY + unit * 0.85} ${right -
        unit * 0.45} ${palmY + unit} L ${right - unit * 0.45} ${wristY} L ${left +
        unit * 0.45} ${wristY} L ${left + unit * 0.45} ${palmY + unit} Q ${left} ${palmY +
        unit * 0.85} ${left} ${palmY + unit * 0.45} Z"
      />`;
      for (const f of indices) {
        const active = f === info?.finger || f === shiftFinger;
        hand += finger({ x: home[f].x + offset.x }, pose.tips[f], f, active, palmY);
      }
      const thumb = pose.tips[side === 0 ? 9 : 8],
        thumbX = thumb.x,
        thumbY = thumb.y,
        active = info?.finger === 8 && side === 1;
      hand += html`<g
        class="overlay-finger overlay-thumb thumb ${active ? 'active' : ''}"
        data-hand-finger="${side === 0 ? 9 : 8}"
        ><path
          d="M ${inner - sign * radius} ${palmY + unit * 0.7} Q ${inner +
          sign * unit * 0.35} ${palmY + unit * 0.5} ${thumbX - sign * radius} ${thumbY +
          radius} Q ${thumbX - sign * radius} ${thumbY - radius} ${thumbX} ${thumbY -
          radius} Q ${thumbX + sign * radius} ${thumbY - radius} ${thumbX +
          sign * radius} ${thumbY + radius * 0.3} L ${inner + sign * radius * 0.5} ${palmY +
          unit * 0.9} Z"
        />${active
          ? html`<circle
              cx="${thumbX}"
              cy="${thumbY - radius * 0.6}"
              r="${radius * 0.23}"
              class="finger-tip"
            />`
          : ''}</g
      >`;
      markup += html`<g class="overlay-hand" data-hand="${side === 0 ? 'left' : 'right'}">
        ${hand}
      </g>`;
    }
    svg.innerHTML = markup;
  };
  handMotion.move(resting, destination, draw, {
    ...options,
    instant: options.instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
}
window.addEventListener('resize', () => {
  if (data.settings.hands) updateKeyboard({ instant: true });
});
function bindInput() {
  const input = $('#typing-input');
  let deadKeyPending = false;
  const focus = () => {
    if (session.status === 'running') input.focus({ preventScroll: true });
  };
  $('#typing-text').addEventListener('click', () => {
    if (session.status === 'ready') togglePause();
    else focus();
  });
  $('#typing-text').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (session.status === 'running') focus();
      else togglePause();
    }
  });
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    toast(t('В упражнении текст нужно набрать вручную.'));
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      deadKeyPending = false;
      input.value = '';
      e.preventDefault();
      togglePause();
      return;
    }
    if (session.status !== 'running') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') {
      if (deadKeyPending) {
        deadKeyPending = false;
        return;
      }
      e.preventDefault();
      session.backspace();
      renderTyping();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Dead') {
      deadKeyPending = true;
      return;
    }
    if (e.key.length === 1 && !e.isComposing && !deadKeyPending) {
      e.preventDefault();
      if (e.repeat) return;
      processChar(e.key);
    }
  });
  input.addEventListener('input', (e) => {
    if (!e.isComposing) {
      deadKeyPending = false;
      const chars = Array.from(input.value.normalize('NFC'));
      input.value = '';
      for (const c of chars) processChar(c);
    }
  });
  input.addEventListener('compositionend', () => {
    deadKeyPending = false;
    const chars = Array.from(input.value.normalize('NFC'));
    input.value = '';
    for (const c of chars) processChar(c);
  });
  input.addEventListener('blur', (e) => {
    if (
      e.relatedTarget?.closest(
        '[data-action="pause"], [data-action="mark-finger"], #hide-speed, #guidance',
      )
    )
      return;
    if (session?.status === 'running') {
      session.pause();
      renderTyping();
    }
  });
}
function processChar(char) {
  if (!session || session.status !== 'running') return;
  session.lastWrong = char;
  const accepted = session.type(char);
  renderTyping({ returnHome: accepted });
  if (session.status === 'done') finish();
}
function markWrongFinger() {
  if (sessionKind !== 'retraining' || session?.status !== 'running') return;
  const marked = session.markWrongFinger();
  if (!marked) {
    toast(
      session.wrong
        ? t('Сначала исправьте опечатку клавишей Backspace.')
        : t('Сначала напечатайте клавишу.'),
    );
    return;
  }
  data.fingerMarks[languageId] ??= {};
  data.fingerMarks[languageId][marked.key] = (data.fingerMarks[languageId][marked.key] || 0) + 1;
  save();
  renderTyping();
  $('[data-action="pause"]:is(.pause-cover button)')?.focus();
}
document.addEventListener('keydown', (e) => {
  if (
    e.key !== 'F2' ||
    e.repeat ||
    e.isComposing ||
    sessionKind !== 'retraining' ||
    session?.status !== 'running'
  )
    return;
  e.preventDefault();
  markWrongFinger();
});
function togglePause() {
  if (!session) return;
  if (session.status === 'done') {
    actions.repeat();
    return;
  }
  if (session.status === 'running') session.pause();
  else if (['ready', 'paused'].includes(session.status)) {
    session.start();
    recordHelp();
  }
  renderTyping();
  if (session.status === 'running') $('#typing-input').focus({ preventScroll: true });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session?.status === 'running') {
    session.pause();
    renderTyping();
  }
});
function startLesson(repeatText = null, repeatTitle = null) {
  stopSession();
  prepareLessonSession(repeatText, repeatTitle);
  tab = 'training';
  track('lesson_started', { lessonId: sessionLesson, layout: layoutName(), hintMode: hintMode() });
  render();
  session.start();
  recordHelp();
  renderTyping();
  $('#typing-input').focus({ preventScroll: true });
}
function prepareLessonSession(repeatText = null, repeatTitle = null) {
  const current = lesson();
  sessionKind = 'lesson';
  sessionLesson = current.id;
  sessionIsRepeat = completed(current.id);
  sessionTitle = current.title;
  let text = repeatText ?? current.text;
  if (repeatText !== null) sessionTitle = repeatTitle ?? current.title;
  else if (current.keys) {
    const seed = newExerciseSeed();
    const keys = [...current.keys];
    const groups =
      current.id === 14
        ? [
            [
              ...new Set([
                ...keys,
                ...keys.map((char) => {
                  const info = keyInfo(language(), char);
                  return language().rows[info.row][info.col];
                }),
              ]),
            ],
          ]
        : [keys];
    text = generateExercise({
      language: language(),
      learned: learned(),
      groups,
      seed,
      gradual: [2, 3, 8, 12].includes(current.id),
    });
    sessionTitle = `${current.title} · seed ${seed}`;
  }
  session = newSession(text);
}
function startPractice(text, title, kind = 'practice', type = kind) {
  stopSession();
  sessionKind = kind;
  sessionPractice = type;
  track('practice_mode_selected', { practiceType: type, layout: layoutName() });
  sessionLesson = null;
  sessionTitle = title;
  session = newSession(text);
  retrainingSetup = false;
  view = 'practice';
  render();
  session.start();
  recordHelp();
  renderTyping();
  $('#typing-input').focus({ preventScroll: true });
}
function modal(content) {
  $('#dialog-content').innerHTML = content;
  if (!$('#dialog').open) $('#dialog').showModal();
}
function closeModal() {
  if ($('#dialog').open) $('#dialog').close();
}
function finish() {
  const result = {
    date: new Date().toISOString(),
    localDay: localDay(),
    language: languageId,
    kind: sessionKind,
    lesson: sessionLesson,
    title: sessionTitle,
    accuracy: session.accuracy(),
    speed: session.speed(),
    duration: session.time(),
    mistakes: session.mistakes,
    fingerMarks: session.fingerMarks,
    length: session.text.length,
    exerciseKey: exerciseKey(session.text),
    presentations: session.presentations(),
    errorPositions: session.errorPositions,
    hintsUsed: session.hintsUsed,
    helpFlags: session.helpFlags,
  };
  data.history.push(result);
  data.history = data.history.slice(-500);
  if (result.kind === 'lesson') recordLessonResult(data, result);
  save();
  if (result.kind === 'lesson')
    track('lesson_completed', {
      lessonId: result.lesson,
      accuracy: result.accuracy,
      charsPerMinute: result.speed,
      durationSec: Math.round(result.duration / 1000),
      hintMode: hintMode(),
      isRepeat: sessionIsRepeat,
    });
  sidebar();
  const passed = result.accuracy >= 95,
    fingerMarkCount = Object.values(result.fingerMarks).reduce((sum, n) => sum + n, 0),
    weak = Object.entries(session.mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    next = sessionKind === 'lesson' && lessonIndex < lessons().length - 1;
  const nextAction =
    !passed || weak.length || fingerMarkCount
      ? ['repeat', t('Повторить движение →')]
      : result.hintsUsed
        ? ['repeat-no-hints', t('Попробовать без подсказок →')]
        : next
          ? ['next', t('Следующий урок →')]
          : ['repeat', t('Повторить движение →')];
  modal(
    html`<div class="result-icon">${passed ? '✦' : '⌁'}</div>
      <h1 class="result-heading">
        ${sessionKind === 'retraining'
          ? t('Короткая тренировка завершена')
          : passed
            ? t('Отлично, ритм найден!')
            : t('Уже ближе к уверенной печати')}
      </h1>
      <p class="dialog-subtitle" style="text-align:center">
        ${sessionKind === 'lesson'
          ? passed
            ? mastered(result.lesson)
              ? t('Урок закреплён. Самостоятельная проверка в другой день пройдена.')
              : `${t('Урок выполнен.')} ${reinforcementHint(result.lesson)}`
            : t('Для прохождения урока нужна точность от 95%. Попробуйте ещё раз без спешки.')
          : t('Тренировка завершена. Результат сохранён.')}
      </p>
      <div class="result-stats">
        <div><b>${result.accuracy}%</b><span>${t('точность')}</span></div>
        <div><b>${result.speed}</b><span>${t('знаков / мин')}</span></div>
        <div>
          <b>${Math.round(result.duration / 1000)} ${t('с')}</b><span>${t('активное время')}</span>
        </div>
        ${sessionKind === 'retraining'
          ? html`<div><b>${fingerMarkCount}</b><span>${t('отметок другого пальца')}</span></div>`
          : ''}
      </div>
      <p class="dialog-subtitle" style="text-align:center">
        ${t('Подсказки:')}
        ${helpLabel(result.helpFlags)}${sessionKind === 'retraining'
          ? ` ${t('· Отметки другого пальца:')} ${fingerMarkCount}`
          : ''}
      </p>
      <div class="result-note">
        ${weak.length
          ? html`${t('Больше всего ошибок на клавишах:')}
              <strong
                >${weak
                  .map(([c, n]) => `${esc(c === ' ' ? t('пробел') : c)} (${n})`)
                  .join(', ')}</strong
              >.`
          : sessionKind === 'retraining' && fingerMarkCount
            ? t('Опечаток нет. Отмеченные движения пальцев можно повторить в следующем упражнении.')
            : t('Ни одной ошибки. Сохраните этот спокойный темп в следующем упражнении.')}<br />${t(
          'Скорость: правильно набранные символы ÷ активное время в минутах. Точность учитывает все попытки, включая исправленные ошибки.',
        )}
        ${sessionKind === 'retraining'
          ? t('Отметки другого пальца сохранены отдельно и не снижают точность.')
          : ''}
      </div>
      <div class="result-actions">
        <button class="primary" data-action="${nextAction[0]}">${nextAction[1]}</button>
      </div>`,
  );
}
function normalizeText(t) {
  return t.normalize('NFC').replace(/\s+/g, ' ').trim();
}
function validateText(text) {
  const bad = [...new Set(Array.from(text).filter((c) => !keyInfo(language(), c)))];
  return bad.length
    ? `${t('В выбранной раскладке нет символов:')} ${bad.slice(0, 10).join(' ')}${t('. Измените текст или выберите другой язык.')}`
    : '';
}
function weakPractice() {
  const chars = recentKeyStats()
    .filter((stat) => stat.difficult)
    .sort((a, b) => b.lower - a.lower)
    .slice(0, 6)
    .map((stat) => stat.char);
  const targets = chars.length
    ? [...chars]
    : [...learnedCharacters(lessons(), 0)].filter((char) => char !== ' ');
  if (targets.length < 3) {
    const anchors = [...learnedCharacters(lessons(), 0)].filter(
      (char) => char !== ' ' && !targets.includes(char),
    );
    targets.push(...anchors.slice(0, 3 - targets.length));
  }
  if (!chars.length)
    toast(t('Пока недостаточно данных о трудных клавишах. Повторим исходную позицию.'));
  const seed = $('#exercise-form [name="seed"]')?.value.trim() || '';
  const label = targets.map((char) => (char === ' ' ? '␠' : char)).join(' ');
  startGenerated(
    [targets],
    `${chars.length ? t('Трудные клавиши') : t('Исходная позиция')} [${label}]`,
    false,
    seed,
  );
}
function newExerciseSeed() {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)), (value) => value.toString(36)).join(
    '-',
  );
}
function startGenerated(groups, title, gradual = false, seed = '', type = 'weak') {
  const chosenSeed = seed || newExerciseSeed();
  const text = generateExercise({
    language: language(),
    learned: learned(),
    groups,
    seed: chosenSeed,
    gradual,
  });
  if (!text) return false;
  startPractice(text, `${title} · seed ${chosenSeed}`, 'practice', type);
  return true;
}
function addLanguage() {
  modal(
    html`<p class="eyebrow">${t('НОВАЯ РАСКЛАДКА')}</p>
      <h2>${t('Добавить язык')}</h2>
      <p class="dialog-subtitle">
        ${t(
          'Для клавиатуры с тремя рядами букв. Создадим восемь уроков: от исходной позиции до вашего текста. Новая раскладка сохранится в этом браузере.',
        )}
      </p>
      <form id="language-form">
        <label class="field"
          >${t('Название языка')}<input
            name="name"
            maxlength="30"
            required
            placeholder="${t('Например, Deutsch')}" /></label
        ><label class="field"
          >${t('Верхний ряд · 12 клавиш')}<input
            name="top"
            required
            placeholder="qwertzuiopü+"
            minlength="12"
            maxlength="12"
            spellcheck="false" /></label
        ><label class="field"
          >${t('Основной ряд · 11 клавиш')}<input
            name="home"
            required
            placeholder="asdfghjklöä"
            minlength="11"
            maxlength="11"
            spellcheck="false" /></label
        ><label class="field"
          >${t('Нижний ряд · 10 клавиш')}<input
            name="bottom"
            required
            placeholder="yxcvbnm,.-"
            minlength="10"
            maxlength="10"
            spellcheck="false"
        /></label>
        <details>
          <summary style="font-size:12px;color:#788398;cursor:pointer;margin-bottom:15px">
            ${t('Настроить ряд цифр и Shift')}
          </summary>
          <label class="field"
            >${t('Ряд цифр · 13 клавиш')}<input
              name="numbers"
              minlength="13"
              maxlength="13"
              placeholder="^1234567890ß´"
              spellcheck="false" /></label
          ><label class="field"
            >${t('Ряд цифр с Shift · 13 символов')}<input
              name="numberShift"
              minlength="13"
              maxlength="13"
              placeholder='°!"§$%&amp;/()=?&#96;'
              spellcheck="false" /></label
          ><label class="field"
            >${t('Верхний ряд с Shift · 12 символов')}<input
              name="topShift"
              minlength="12"
              maxlength="12"
              spellcheck="false" /></label
          ><label class="field"
            >${t('Основной ряд с Shift · 11 символов')}<input
              name="homeShift"
              minlength="11"
              maxlength="11"
              spellcheck="false" /></label
          ><label class="field"
            >${t('Нижний ряд с Shift · 10 символов')}<input
              name="bottomShift"
              minlength="10"
              maxlength="10"
              spellcheck="false"
          /></label>
        </details>
        <label class="field"
          >${t('Учебный текст')}<textarea
            name="text"
            required
            maxlength="1500"
            placeholder="${t('Текст на новом языке с символами указанной раскладки')}"
          ></textarea>
        </label>
        <p class="form-note">
          ${t(
            'Вводите символы без пробелов, слева направо. Верхний ряд начинается с клавиши под «1», основной — справа от Caps Lock. По умолчанию ряд цифр английский, Shift превращает буквы в заглавные. Если знаки отличаются, укажите их в дополнительных настройках.',
          )}
        </p>
        <p class="form-error" id="language-error" role="alert"></p>
        <button class="primary" type="submit">${t('Добавить и начать →')}</button>
      </form>`,
  );
}
function analyticsSection() {
  if (!analyticsAvailable())
    return html`<p class="form-note" id="analytics-note">
      ${t('Статистика использования не собирается: в этой версии она не подключена.')}
    </p>`;
  return html`<div class="profile-options">
      <label class="check-label"
        ><input
          id="profile-analytics"
          type="checkbox"
          ${data.settings.analytics ? 'checked' : ''}
        />${t('Анонимная статистика использования')}</label
      >
    </div>
    <p class="form-note" id="analytics-note">
      ${t(
        'Собираем только обезличенные данные: какие уроки начаты и пройдены, точность, скорость, время, выбранные подсказки и режимы практики. Не передаём то, что вы печатаете, свой текст, имя и содержимое файлов; cookie и идентификатор не сохраняются. Отключить можно здесь в любой момент.',
      )}
    </p>`;
}
function openProfile() {
  if (session?.status === 'running') {
    session.pause();
    renderTyping();
  }
  pendingImport = null;
  importRequest++;
  modal(
    html`<p class="eyebrow">${t('ВАШ ЛИЧНЫЙ РИТМ')}</p>
      <h2>${t('Профиль и перенос данных')}</h2>
      <p class="dialog-subtitle">
        ${t(
          'Профиль, настройки и прогресс хранятся в этом браузере. Файл переноса позволяет продолжить занятия в другом браузере или на другом компьютере.',
        )}
      </p>
      <form id="profile-form">
        <label class="field"
          >${t('Ваше имя')}<input
            id="profile-name"
            maxlength="40"
            value="${esc(data.profile.name)}"
            placeholder="${t('Как к вам обращаться?')}"
            autocomplete="nickname"
        /></label>
        <div class="profile-options">
          ${[
            ['colors', t('Цветные зоны пальцев')],
            ['letters', t('Буквы на клавишах')],
            ['hands', t('Показать руки над клавиатурой')],
          ]
            .map(
              ([key, label]) =>
                html`<label class="check-label"
                  ><input
                    id="profile-${key}"
                    type="checkbox"
                    ${data.settings[key] ? 'checked' : ''}
                  />${label}</label
                >`,
            )
            .join('')}
          <label class="check-label" for="profile-hint-mode"
            >${t('Подсказки движения')}
            <select id="profile-hint-mode">
              ${[
                ['auto', t('Авто')],
                ['always', t('Всегда')],
                ['off', t('Выкл.')],
              ]
                .map(
                  ([value, label]) =>
                    html`<option
                      value="${value}"
                      ${data.settings.hintMode === value ? 'selected' : ''}
                    >
                      ${label}
                    </option>`,
                )
                .join('')}
            </select>
          </label>
        </div>
        ${analyticsSection()}
        <p id="profile-save-state" class="form-note" role="status">
          ${t('Изменения сохраняются автоматически.')}
        </p>
      </form>
      <section class="transfer-section">
        <h3>${t('Перенести в другой браузер')}</h3>
        <p class="form-note">
          ${t(
            '1. Скачайте файл здесь. 2. Откройте Ритм в новом браузере. 3. Выберите этот файл и нажмите «Применить файл».',
          )}
        </p>
        <button class="secondary" data-action="export">${t('Скачать файл профиля')}</button
        ><label class="field import-field"
          >${t('Применить файл из другого браузера')}<input
            id="import-file"
            type="file"
            accept=".json,application/json"
        /></label>
        <p class="form-note">
          ${t(
            'В файле: имя, настройки подсказок, выбранные языки и уроки, прогресс, история и добавленные раскладки. Файл читается прямо в браузере.',
          )}
        </p>
        <p id="import-error" class="form-error" role="alert"></p>
        <div id="import-preview"></div>
      </section>`,
  );
  $('#profile-name').addEventListener('input', saveProfileInputs);
  for (const key of ['colors', 'letters', 'hands'])
    $(`#profile-${key}`).addEventListener('change', saveProfileInputs);
  $('#profile-hint-mode').addEventListener('change', saveProfileInputs);
  $('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveProfileInputs();
  });
  $('#import-file').addEventListener('change', readImport);
  $('#profile-analytics')?.addEventListener('change', (e) => {
    data.settings.analytics = e.target.checked;
    save();
    setAnalyticsEnabled(data.settings.analytics);
    if (data.settings.analytics) track('settings_changed', { setting: 'analytics', enabled: true });
  });
}
function saveProfileInputs() {
  data.profile.name = $('#profile-name').value.trim();
  const hintModeChanged = data.settings.hintMode !== $('#profile-hint-mode').value;
  data.settings.hintMode = $('#profile-hint-mode').value;
  if (hintModeChanged) reportHintChange('hintMode');
  if ($('#hint-mode')) $('#hint-mode').value = data.settings.hintMode;
  for (const key of ['colors', 'letters', 'hands']) {
    const changed = data.settings[key] !== $(`#profile-${key}`).checked;
    data.settings[key] = $(`#profile-${key}`).checked;
    if (changed) reportHintChange(key);
    if ($(`#${key}`)) $(`#${key}`).checked = data.settings[key];
  }
  recordHelp();
  $('.keyboard')?.classList.toggle('colored', data.settings.colors);
  $('.keyboard')?.classList.toggle('no-letters', !data.settings.letters);
  updateKeyboard();
  $('#profile-save-state').textContent = save()
    ? t('Сохранено в этом браузере.')
    : t('Сохранение недоступно. Можно скачать файл профиля.');
  $('#profile-label').textContent = data.profile.name || t('Мой профиль');
  $('#profile-avatar').textContent = Array.from(data.profile.name || t('Я'))[0].toUpperCase();
}
function exportProfile() {
  try {
    const blob = new Blob([JSON.stringify(makeBackup(data), null, 2)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `ritm-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    track('profile_exported');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast(`${t('Не удалось создать файл:')} ${error.message}`);
  }
}
async function readImport(event) {
  const request = ++importRequest,
    file = event.target.files?.[0];
  pendingImport = null;
  $('#import-error').textContent = '';
  $('#import-preview').innerHTML = '';
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error(t('Файл слишком большой. Максимум — 2 МБ.'));
    const contents = await file.text();
    if (request !== importRequest || !$('#import-preview')) return;
    let parsed;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new Error(t('Не удалось прочитать JSON. Выберите файл, скачанный из Ритма.'));
    }
    pendingImport = parseBackup(parsed);
    const passed = Object.values(pendingImport.progress).reduce(
      (total, records) => total + Object.values(records).filter((a) => a >= 95).length,
      0,
    );
    const secured = Object.values(pendingImport.reinforcement).reduce(
      (total, records) =>
        total + Object.values(records).filter((record) => record.masteredDay).length,
      0,
    );
    $('#import-preview').innerHTML = html`<div class="import-preview">
      <h3>${t('Файл готов к применению')}</h3>
      <p>
        <strong>${esc(pendingImport.profile.name || t('Профиль без имени'))}</strong> · ${passed}
        ${t('выполненных уроков ·')} ${secured} ${t('закреплённых ·')}
        ${pendingImport.history.length} ${t('занятий ·')}
        ${Object.keys(pendingImport.customLanguages).length} ${t('добавленных раскладок')}
      </p>
      <p class="form-note">
        ${esc(file.name)}<br />${t(
          'Заменит профиль, настройки и прогресс в этом браузере. До применения можно скачать текущий профиль.',
        )}
      </p>
      <button class="primary" data-action="apply-import">${t('Применить файл →')}</button>
    </div>`;
  } catch (error) {
    if (request === importRequest && $('#import-error')) {
      $('#import-error').textContent = error.message;
      pendingImport = null;
    }
  }
}
function applyImport() {
  if (!pendingImport) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingImport));
  } catch {
    $('#import-error').textContent = t(
      'Не удалось сохранить файл в браузере. Текущие данные не изменены. Проверьте доступ к хранилищу и свободное место.',
    );
    return;
  }
  stopSession();
  data = pendingImport;
  setLocale(data.uiLanguage);
  pendingImport = null;
  importRequest++;
  storageAvailable = true;
  setAnalyticsEnabled(data.settings.analytics);
  track('profile_imported');
  languages = { ...builtinLanguages, ...data.customLanguages };
  languageId = data.selected;
  lessonIndex = data.lessons[languageId] || 0;
  sessionTitle = '';
  tab = 'lecture';
  view = 'progress';
  closeModal();
  render();
  toast(t('Профиль, настройки и прогресс перенесены.'));
}
const actions = {
  'hand-demo': () => {
    data.settings.hands = true;
    recordHelp();
    save();
    if ($('#hands')) $('#hands').checked = true;
    const expected = session?.text[session.position] || lesson().text[0];
    updateHandOverlay(keyInfo(language(), expected), expected, { demo: true });
  },
  'start-lesson': startLesson,
  pause: togglePause,
  'repeat-no-hints': () => {
    data.settings.guidance = false;
    save();
    actions.repeat();
  },
  repeat: () => {
    const text = session?.text,
      title = sessionTitle,
      kind = sessionKind;
    closeModal();
    if (kind === 'lesson') startLesson(text, title);
    else if (text) startPractice(text, title, kind, sessionPractice);
  },
  next: () => {
    closeModal();
    stopSession();
    lessonIndex++;
    data.lessons[languageId] = lessonIndex;
    save();
    tab = 'lecture';
    render();
    $('#main').focus();
  },
  'show-progress': () => {
    closeModal();
    stopSession();
    view = 'progress';
    render();
  },
  'go-learn': () => {
    stopSession();
    view = 'learn';
    tab = 'lecture';
    render();
  },
  'new-practice': () => {
    stopSession();
    retrainingSetup = false;
    render();
  },
  'retraining-open': () => {
    stopSession();
    retrainingSetup = true;
    view = 'practice';
    render();
  },
  'retraining-close': () => {
    retrainingSetup = false;
    render();
  },
  'start-retraining': () => {
    const keys = data.retrainingKeys[languageId] || [];
    if (!keys.length) return;
    startPractice(retrainingDrill(language(), keys), t('Переучиваюсь'), 'retraining', 'retraining');
  },
  'mark-finger': markWrongFinger,
  'practice-sample': () =>
    startPractice(language().text, t('Текст для разминки'), 'practice', 'sample'),
  'practice-weak': () => {
    closeModal();
    weakPractice();
  },
  'add-language': addLanguage,
  export: exportProfile,
  profile: openProfile,
  'apply-import': applyImport,
  'reset-progress': () =>
    modal(
      html`<h2>${t('Сбросить историю и достижения?')}</h2>
        <p class="dialog-subtitle">
          ${t(
            'Будут удалены результаты всех языков, состояния «Выполнено» и «Закреплено». Добавленные раскладки останутся. Перед сбросом можно скачать прогресс.',
          )}
        </p>
        <div class="row-actions">
          <button class="secondary" data-action="export">${t('Скачать прогресс')}</button
          ><button class="primary" data-action="confirm-reset">${t('Удалить результаты')}</button>
        </div>`,
    ),
  'confirm-reset': () => {
    data.history = [];
    data.progress = {};
    data.fingerMarks = {};
    data.reinforcement = {};
    save();
    closeModal();
    render();
    toast(t('История занятий сброшена.'));
  },
};
document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (button && actions[button.dataset.action]) actions[button.dataset.action]();
});
$('#lesson-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lesson]');
  if (!b) return;
  stopSession();
  lessonIndex = Number(b.dataset.lesson);
  view = 'learn';
  tab = 'lecture';
  sessionTitle = '';
  data.lessons[languageId] = lessonIndex;
  save();
  render();
});
document.querySelectorAll('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    stopSession();
    view = b.dataset.view;
    tab = 'lecture';
    render();
  }),
);
$('.brand').addEventListener('click', (e) => {
  e.preventDefault();
  stopSession();
  view = 'learn';
  tab = 'lecture';
  render();
});
$('#main').addEventListener('click', (e) => {
  const key = e.target.closest('[data-retraining-key]');
  if (key && retrainingSetup && !session) {
    const value = key.dataset.retrainingKey;
    const selected = [...(data.retrainingKeys[languageId] || [])];
    const index = selected.indexOf(value);
    if (index >= 0) selected.splice(index, 1);
    else if (selected.length >= 8) {
      toast(t('Можно выбрать до 8 клавиш для короткого упражнения.'));
      return;
    } else selected.push(value);
    data.retrainingKeys[languageId] = selected;
    const position = key.dataset.key;
    save();
    render();
    $(`[data-key="${position}"]`)?.focus();
    return;
  }
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  const nextTab = b.dataset.tab;
  if (nextTab === 'lecture') {
    stopSession();
    sessionTitle = '';
  } else {
    if (!session) {
      sessionKind = 'lesson';
      sessionLesson = lesson().id;
      sessionTitle = lesson().title;
    }
  }
  tab = nextTab;
  render();
});
$('#interface-language').addEventListener('change', (e) => {
  data.uiLanguage = e.target.value;
  setLocale(data.uiLanguage);
  if (session?.status === 'running') session.pause();
  if (sessionKind === 'lesson' && session) sessionTitle = lesson().title;
  save();
  render();
});
$('#language').addEventListener('change', (e) => {
  stopSession();
  languageId = e.target.value;
  data.selected = languageId;
  lessonIndex = data.lessons[languageId] || 0;
  tab = 'lecture';
  sessionTitle = '';
  save();
  render();
});
$('#add-language').addEventListener('click', addLanguage);
$('#open-profile').addEventListener('click', openProfile);
$('#help').addEventListener('click', () => {
  if (session?.status === 'running') {
    session.pause();
    renderTyping();
  }
  modal(
    html`<p class="eyebrow">${t('ПЕЧАТАЙТЕ СПОКОЙНО')}</p>
      <h2>${t('Как заниматься с Ритмом')}</h2>
      <p class="dialog-subtitle">
        ${t(
          'Выбор языка в тренажёре не переключает системную раскладку. Перед началом переключите её в операционной системе.',
        )}
      </p>
      ${hands()}${basics()}
      <div class="row-actions">
        <button class="secondary" data-action="add-language">${t('+ Добавить язык')}</button>
      </div>`,
  );
});
$('#close-dialog').addEventListener('click', closeModal);
$('#dialog').addEventListener('click', (e) => {
  if (e.target === $('#dialog')) {
    const r = $('#dialog').getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      closeModal();
  }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'exercise-form') {
    e.preventDefault();
    const form = new FormData(e.target, e.submitter),
      mode = String(form.get('mode')),
      finger = Number(form.get('finger')),
      other = Number(form.get('otherFinger')),
      hand = String(form.get('hand')),
      seed = String(form.get('seed')).trim(),
      keys = [...String(form.get('keys'))];
    let groups,
      title,
      gradual = false;
    if (mode === 'finger') {
      groups = [fingerKeys(language(), learned(), finger)];
      if (finger === 8)
        groups[0].push(
          ...[...learnedCharacters(lessons(), 0)].filter((char) => char !== ' ').slice(0, 2),
        );
      title = finger === 8 ? t('Большой палец и опорные клавиши') : t(fingers[finger]);
      gradual = [0, 1, 6, 7].includes(finger);
    } else if (mode === 'fingers') {
      groups =
        finger === 8
          ? [fingerKeys(language(), learned(), other), [' ']]
          : [fingerKeys(language(), learned(), finger), fingerKeys(language(), learned(), other)];
      title = `${t(fingers[finger])} + ${t(fingers[other])}`;
      gradual = [0, 1, 6, 7].includes(finger) || [0, 1, 6, 7].includes(other);
    } else if (mode === 'hand') {
      groups = [handKeys(language(), learned(), hand)];
      title = hand === 'left' ? t('Левая рука') : t('Правая рука');
    } else if (mode === 'hands') {
      groups = [handKeys(language(), learned(), 'left'), handKeys(language(), learned(), 'right')];
      title = t('Чередование рук');
    } else if (mode === 'keys') {
      if (!keys.some((char) => char !== ' ') || keys.some((char) => !learned().has(char))) {
        $('#exercise-error').textContent = t(
          'Введите изученные клавиши, включая хотя бы одну букву или знак.',
        );
        return;
      }
      groups = [keys];
      title = `${t('Указанные клавиши [')}${keys.map((char) => (char === ' ' ? '␠' : char)).join(' ')}]`;
    } else {
      return;
    }
    if (mode === 'fingers' && finger === other) {
      $('#exercise-error').textContent = t('Выберите два разных пальца.');
      return;
    }
    if (!startGenerated(groups, title, gradual, seed, mode))
      $('#exercise-error').textContent = t(
        'В выбранном уроке пока нет клавиш для этого упражнения.',
      );
    return;
  }
  if (e.target.id === 'practice-form') {
    e.preventDefault();
    customText = $('#custom-text').value;
    const text = normalizeText(customText),
      error = !text ? t('Добавьте текст для практики.') : validateText(text);
    if (error) {
      $('#practice-error').textContent = error;
      return;
    }
    startPractice(text, t('Свой текст'), 'practice', 'custom');
  }
  if (e.target.id === 'language-form') {
    e.preventDefault();
    const form = new FormData(e.target),
      rows = [
        String(form.get('numbers')).trim() || builtinLanguages.en.rows[0],
        String(form.get('top')).trim(),
        String(form.get('home')).trim(),
        String(form.get('bottom')).trim(),
      ],
      name = String(form.get('name')).trim(),
      text = normalizeText(String(form.get('text')));
    const error = (m) => {
      $('#language-error').textContent = m;
    };
    if (!name || !text) return error(t('Укажите название и учебный текст.'));
    if (rows.some((r, i) => Array.from(r).length !== [13, 12, 11, 10][i] || /\s/.test(r)))
      return error(t('Проверьте количество клавиш: 13, 12, 11 и 10, без пробелов.'));
    if (new Set(Array.from(rows.join(''))).size !== Array.from(rows.join('')).length)
      return error(t('Символы клавиш не должны повторяться между рядами.'));
    const shift = ['numberShift', 'topShift', 'homeShift', 'bottomShift'].map(
      (n, i) =>
        String(form.get(n)).trim() ||
        (i === 0
          ? builtinLanguages.en.shift[0]
          : Array.from(rows[i])
              .map((c) => c.toUpperCase())
              .join('')),
    );
    if (shift.some((r, i) => Array.from(r).length !== [13, 12, 11, 10][i] || /\s/.test(r)))
      return error(t('Ряды с Shift должны совпадать по длине с основными рядами.'));
    const l = { name, layout: name, rows, shift, text, custom: true };
    const bad = Array.from(text).filter((c) => !keyInfo(l, c));
    if (bad.length)
      return error(
        `${t('В тексте есть символы вне раскладки:')} ${[...new Set(bad)].slice(0, 10).join(' ')}.`,
      );
    const id = 'custom-' + Date.now().toString(36);
    languages[id] = l;
    data.customLanguages[id] = l;
    languageId = id;
    data.selected = id;
    lessonIndex = 0;
    stopSession();
    view = 'learn';
    tab = 'lecture';
    save();
    closeModal();
    render();
    toast(t('Язык добавлен. Начните с исходной позиции.'));
  }
});
lessonIndex = Math.min(lessonIndex, lessons().length - 1);
initAnalytics(data.settings);
window.addEventListener('pagehide', () => reportAbandoned({ beacon: true }));
render();
if (loadError)
  toast(t('Не удалось прочитать сохранённый профиль. Можно восстановить его из файла.'));
else save();
