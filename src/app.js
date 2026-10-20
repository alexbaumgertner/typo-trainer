import { html } from './ui/html.js';
import { HandMotion, handPose } from './ui/hand-motion.js';
import {
  builtinLanguages,
  fingers,
  fingerClasses,
  zoneRows,
  keyInfo,
  lessonsFor,
  drill,
  retrainingDrill,
  homePosition,
  TypingSession,
} from './course.js';
import { STORAGE_KEY, emptyProfile, parseBackup, makeBackup } from './storage.js';
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
  customText = '',
  retrainingSetup = false;
function language() {
  return languages[languageId];
}
function lessons() {
  return lessonsFor(language());
}
function lesson() {
  return lessons()[Math.min(Math.max(0, lessonIndex), lessons().length - 1)];
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
    toast('Не удалось сохранить данные. Проверьте свободное место и доступ к хранилищу браузера.');
    return false;
  }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
}
function stopSession() {
  handMotion.stop();
  if (session?.status === 'running') session.pause();
  session = null;
}
function completed(id) {
  return (data.progress[languageId]?.[id] || 0) >= 95;
}
function sidebar() {
  $('#profile-label').textContent = data.profile.name || 'Мой профиль';
  $('#profile-avatar').textContent = Array.from(data.profile.name || 'Я')[0].toUpperCase();
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
          <span class="lesson-num ${completed(l.id) ? 'done' : ''}"
            >${completed(l.id) ? '✓' : String(l.id + 1).padStart(2, '0')}</span
          ><span>${l.title}</span
          ><span class="lesson-arrow">${view === 'learn' && l.id === lessonIndex ? '›' : ''}</span>
        </button>`
      );
    })
    .join('');
  const done = lessons().filter((l) => completed(l.id)).length;
  $('#course-count').textContent = `${done} / ${lessons().length}`;
  $('#course-fill').style.width = `${(100 * done) / lessons().length}%`;
  document.querySelectorAll('.nav').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
    b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false');
  });
}
function hands() {
  const home = Array.from(language().rows[2]);
  const homeKeys = [home.slice(0, 4), home.slice(6, 10)]
    .map((keys) => keys.join(' ').toUpperCase())
    .join('     ');
  return html`<div class="hand-panel">
    <svg
      viewBox="0 0 320 135"
      role="img"
      aria-label="Обе руки: пальцы над клавишами основного ряда, большие пальцы у пробела"
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
                >${esc(home[[0, 1, 2, 3, 6, 7, 8, 9][f]]?.toUpperCase() || '')}</text
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
    <span class="hand-caption">Указательные пальцы — на клавишах с выступами</span>
  </div>`;
}
function keyMarkup(char, row, col) {
  const choosing = view === 'practice' && retrainingSetup && !session;
  const selected = (data.retrainingKeys[languageId] || []).includes(char);
  const f = zoneRows[row][col],
    next = session?.text[session.position],
    info = keyInfo(language(), next || (view === 'learn' ? lesson().text[0] : ''));
  const isNext = info?.row === row && info?.col === col;
  const classes = `key ${fingerClasses[f]} ${row === 2 && [3, 6].includes(col) ? 'home' : ''} ${isNext ? 'next' : ''} ${choosing && selected ? 'selected' : ''}`;
  const label = html`<span class="shift-label"
      >${esc(
        language().shift[row]?.[col] === char.toUpperCase()
          ? ''
          : language().shift[row]?.[col] || '',
      )}</span
    >${esc(char.toUpperCase())}`;
  return choosing
    ? html`<button
        type="button"
        class="${classes}"
        data-key="${row}-${col}"
        data-retraining-key="${esc(char)}"
        aria-pressed="${selected}"
        aria-label="${esc(char.toUpperCase())}, ${esc(fingers[f])}${selected ? ', выбрана' : ''}"
        title="${esc(char)} · ${esc(fingers[f])}"
      >
        ${label}
      </button>`
    : html`<div
        class="${classes}"
        data-key="${row}-${col}"
        title="${esc(char)} · ${esc(fingers[f])}"
      >
        ${label}
      </div>`;
}
function keyboard() {
  return html`<section class="keyboard-card" aria-label="Подсказка клавиатуры">
    <div class="keyboard-heading">
      <h2>Клавиатура · ${esc(language().layout)}</h2>
      <div class="keyboard-options">
        <button class="text-button" data-action="hand-demo">Показать движение</button>
        <label class="check-label"
          ><input id="hands" type="checkbox" ${data.settings.hands ? 'checked' : ''} />Показать
          руки</label
        ><label class="check-label"
          ><input id="colors" type="checkbox" ${data.settings.colors ? 'checked' : ''} />Зоны
          пальцев</label
        ><label class="check-label"
          ><input id="letters" type="checkbox" ${data.settings.letters ? 'checked' : ''} />Буквы на
          клавишах</label
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
          <div class="key space" id="space-key">Пробел</div>
          <div class="key special">Alt</div>
          <div class="key special">Ctrl</div>
        </div>
        <svg
          id="keyboard-hands"
          class="keyboard-hands"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Положение рук над клавиатурой"
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
                'Мизинец',
                'Безымянный',
                'Средний',
                'Указательный',
              ][i]}</span
            >`,
        )
        .join('')}
    </div>
    <div class="finger-help">
      <p id="finger-hint">
        <span class="hint-symbol">→</span> <strong>Каждому пальцу — своя зона.</strong>
      </p>
      <p>После нажатия возвращайтесь на основной ряд</p>
    </div>
  </section>`;
}
function basics() {
  const h = Array.from(language().rows[2]);
  return html`<div class="basics-content">
    <h3>1. Найдите исходную позицию без взгляда на клавиатуру</h3>
    <p>
      Проведите указательными пальцами по среднему ряду: на клавишах
      <strong>${esc(h[3].toUpperCase())} и ${esc(h[6].toUpperCase())}</strong> находятся небольшие
      выступы. Положите на них указательные пальцы. Затем расположите остальные пальцы на соседних
      клавишах. Пальцы слегка согнуты, кисти продолжают линию предплечий.
    </p>
    <table class="finger-table">
      <thead>
        <tr>
          <th>Палец</th>
          <th>Левая рука</th>
          <th>Правая рука</th>
        </tr>
      </thead>
      <tbody>
        ${['Мизинец', 'Безымянный', 'Средний', 'Указательный']
          .map(
            (f, i) =>
              html`<tr>
                <td>${f}</td>
                <td>${esc(h[i].toUpperCase())}</td>
                <td>${esc(h[9 - i].toUpperCase())}</td>
              </tr>`,
          )
          .join('')}
        <tr>
          <td>Большой</td>
          <td colspan="2">Пробел — удобным большим пальцем</td>
        </tr>
      </tbody>
    </table>
    <h3>2. Двигайте нужный палец и возвращайте его домой</h3>
    <p>
      Цвет на клавиатуре показывает зону пальца. Указательные обслуживают две колонки, остальные
      пальцы — свои зоны. Нажмите клавишу легко и верните палец на исходную клавишу. Оставляйте
      остальные пальцы рядом с основным рядом, не зажимайте кисти. Для дальних клавиш допустимо
      небольшое движение руки.
    </p>
    <h3>3. Положение тела и техника</h3>
    <p>
      Сядьте удобно, с опорой для спины и стоп. Расслабьте плечи; локти держите близко к телу,
      предплечья — примерно горизонтально. Клавиатура должна быть перед вами. Во время печати не
      переносите вес на запястья. Смотрите на экран; если забыли положение рук, найдите выступы
      наощупь. При дискомфорте остановитесь и измените положение.
    </p>
    <h3>4. Shift, пробел и исправления</h3>
    <p>
      Пробел нажимайте большим пальцем. Для заглавной буквы удерживайте Shift мизинцем
      противоположной руки. Например, для буквы ${esc(h[0].toUpperCase())} используйте правый Shift.
      После буквы отпустите Shift. В тренажёре ошибка останавливает курсор: нажмите Backspace и
      введите нужный символ. Исправление не убирает ошибку из статистики точности.
    </p>
    <h3>5. Как строить занятия</h3>
    <p>
      Начните с 10–15 минут в день: повторите прошлый урок, выполните новый и потренируйте трудные
      клавиши. Цель курса — не менее 95% точности; это выбранный ориентир тренажёра, а не
      универсальная норма. Уроки можно открыть в любом порядке, но новичку полезно двигаться
      последовательно. При усталости сделайте перерыв, а скорость увеличивайте постепенно.
    </p>
    <p class="sources">
      Принципы постановки рук и техники:
      <a href="https://www.ratatype.com/learn/" target="_blank" rel="noopener">Ratatype</a>. Подход
      к повторению уроков и визуальным подсказкам:
      <a href="https://www.typingclub.com/" target="_blank" rel="noopener">TypingClub</a>.
      Упражнения и лекции написаны для этого курса.
    </p>
  </div>`;
}
function learnPage() {
  const l = lesson();
  return html`<div class="breadcrumb">
      Обучение <span>›</span> ${esc(language().name)} <span>›</span
      ><span class="current">Урок ${l.id + 1}</span>
    </div>
    <div class="page-heading">
      <div>
        <p class="eyebrow">ШАГ ${String(l.id + 1).padStart(2, '0')} ИЗ ${lessons().length}</p>
        <h1>${l.title}</h1>
      </div>
      <span class="badge"
        ><i></i>${l.id === 0 ? 'Начинаем с нуля' : 'Точность прежде скорости'}</span
      >
    </div>
    <p class="subtitle">
      ${l.id === 0
        ? 'Познакомьтесь с клавиатурой. Найдите опору для каждого пальца.'
        : 'Новые движения, немного теории и спокойная практика.'}
    </p>
    <div class="lesson-tabs">
      <button class="lesson-tab ${tab === 'lecture' ? 'active' : ''}" data-tab="lecture">
        <span class="tab-dot">1</span>Небольшая лекция</button
      ><button class="lesson-tab ${tab === 'training' ? 'active' : ''}" data-tab="training">
        <span class="tab-dot">2</span>Практика
      </button>
    </div>
    <p class="mobile-note">
      Для обучения десятью пальцами подключите физическую клавиатуру. На телефоне можно читать
      лекции.
    </p>
    ${tab === 'lecture'
      ? html`<section class="lecture-card">
          <div class="lecture-copy">
            <div class="small-label">ПЕРЕД ПЕРВЫМ НАЖАТИЕМ</div>
            <h2>${l.id === 0 ? 'Ваши пальцы уже знают, где начать' : l.title}</h2>
            <p>${esc(l.focus)}</p>
            ${l.keys
              ? html`<div class="key-pills">
                  ${Array.from(l.keys)
                    .slice(0, 14)
                    .map((c) => html`<span class="key-pill">${esc(c.toUpperCase())}</span>`)
                    .join('')}
                </div>`
              : ''}${l.keys
              ? html`<p class="finger-assignment">
                  ${[...new Set(Array.from(l.keys).map((c) => keyInfo(language(), c)?.finger))]
                    .filter((f) => f !== undefined)
                    .map(
                      (f) =>
                        html`<span
                          ><strong>${fingers[f]}:</strong> ${Array.from(l.keys)
                            .filter((c) => keyInfo(language(), c)?.finger === f)
                            .map((c) => esc(c.toUpperCase()))
                            .join(' ')}</span
                        >`,
                    )
                    .join('')}
                </p>`
              : ''}
            <div class="lecture-actions">
              <button class="primary" data-action="start-lesson">
                Начать практику <span>→</span></button
              ><span class="reading-time">около 2 минут</span>
            </div>
          </div>
          ${hands()}
        </section>`
      : trainingMarkup()}${keyboard()}${tab === 'lecture'
      ? html`<div class="foundation">
          <div class="foundation-item">
            <span class="foundation-icon">◎</span>
            <div>
              <h3>Смотрите на экран</h3>
              <p>Нащупайте выступы на клавишах.<br />Клавиатура подскажет движение.</p>
            </div>
          </div>
          <div class="foundation-item">
            <span class="foundation-icon">⌁</span>
            <div>
              <h3>Сначала точность</h3>
              <p>Не спешите. Ровный ритм важнее<br />количества нажатий.</p>
            </div>
          </div>
          <div class="foundation-item">
            <span class="foundation-icon">↶</span>
            <div>
              <h3>Возвращайтесь домой</h3>
              <p>После нажатия пальцы снова<br />над основным рядом.</p>
            </div>
          </div>
        </div>`
      : ''}
    <details class="basics" ${l.id === 0 && tab === 'lecture' ? 'open' : ''}>
      <summary>Постановка пальцев и техника · подробная инструкция</summary>
      ${basics()}
    </details>`;
}
function trainingMarkup() {
  if (!session) session = new TypingSession(lesson().text);
  return html`<div class="stats-strip">
      <div class="live-stat">
        <span>СКОРОСТЬ</span><b id="live-speed">0</b><small>зн/мин</small>
      </div>
      <div class="live-stat"><span>ТОЧНОСТЬ</span><b id="live-accuracy">100%</b></div>
      <div class="live-stat"><span>ВРЕМЯ</span><b id="live-time">0:00</b></div>
      <div class="live-stat">
        ${sessionKind === 'retraining'
          ? '<span>ДРУГИМ ПАЛЬЦЕМ</span><b id="live-finger-marks">0</b><small>самопроверка</small>'
          : '<span>ЦЕЛЬ</span><b>95%</b><small>точности</small>'}
      </div>
    </div>
    <section class="typing-card">
      <div class="typing-top">
        <b>${esc(sessionTitle || lesson().title)}</b
        ><span id="typing-count">0 / ${session.text.length} символов</span>
      </div>
      <div
        class="typing-text"
        id="typing-text"
        tabindex="0"
        role="button"
        aria-label="Сфокусировать поле набора"
      ></div>
      <textarea
        id="typing-input"
        class="typing-input"
        aria-label="Поле набора: повторяйте текст упражнения"
        aria-describedby="typing-feedback"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      ></textarea>
      <div class="typing-message">
        <span id="typing-feedback" role="status">Нажмите «Начать», затем печатайте текст выше.</span
        >${sessionKind === 'retraining'
          ? '<button class="secondary" data-action="mark-finger" aria-keyshortcuts="F2">Нажал другим пальцем · F2</button>'
          : ''}<button class="text-button" data-action="pause" id="pause-button">Начать →</button>
      </div>
      <div id="pause-cover"></div>
    </section>`;
}
function retrainingSetupMarkup() {
  const keys = data.retrainingKeys[languageId] || [];
  const homes = [0, 1, 2, 3, 6, 7, 8, 9].map((col) => language().rows[2][col]);
  return html`<section class="practice-form retraining-setup">
      <h2>Переучиваюсь</h2>
      <p>
        Выберите до 8 проблемных клавиш на клавиатуре ниже. Каждая кнопка показывает назначенные
        руку и палец; повторное нажатие снимает выбор. Для каждой клавиши упражнение добавит
        возвращение в исходную позицию.
      </p>
      <p class="form-note">
        Браузер не видит, каким пальцем вы нажали клавишу. Отмечайте привычное движение сами кнопкой
        или клавишей F2 во время набора.
      </p>
      <div id="retraining-selection" aria-live="polite">
        ${keys.length
          ? html`<ul class="retraining-keys">
              ${keys
                .map((key) => {
                  const finger = keyInfo(language(), key).finger;
                  return html`<li>
                    <strong>${esc(key.toUpperCase())}</strong> · ${esc(fingers[finger])} · исходная
                    ${esc(homes[finger].toUpperCase())}
                  </li>`;
                })
                .join('')}
            </ul>`
          : '<p>Пока не выбрана ни одна клавиша.</p>'}
      </div>
      <button class="primary" data-action="start-retraining" ${keys.length ? '' : 'disabled'}>
        Начать короткое упражнение →
      </button>
      <button class="text-button" data-action="retraining-close">Другие виды практики</button>
    </section>
    ${keyboard()}`;
}
function practicePage() {
  return html`<div class="breadcrumb">
      Практика <span>›</span><span class="current">${esc(language().name)}</span>
    </div>
    <div class="page-heading">
      <div>
        <p class="eyebrow">В ВАШЕМ ТЕМПЕ</p>
        <h1>Больше практики, меньше ошибок</h1>
      </div>
      <button class="secondary" data-action="add-language">+ Добавить язык</button>
    </div>
    <p class="subtitle">Закрепите трудные клавиши или потренируйтесь на своём тексте.</p>
    ${session
      ? html`${sessionKind === 'retraining'
            ? '<p class="form-note">Самопроверка: нажмите F2 сразу после клавиши, которую нажали не тем пальцем. Занятие остановится и предложит повторить сочетание.</p>'
            : ''}${trainingMarkup()}${keyboard()}
          <div class="row-actions">
            <button
              class="secondary"
              data-action="${sessionKind === 'retraining' ? 'retraining-open' : 'new-practice'}"
            >
              ${sessionKind === 'retraining' ? 'Выбрать клавиши' : 'Выбрать другой текст'}</button
            ><button class="text-button" data-action="repeat">Начать заново</button>
          </div>`
      : retrainingSetup
        ? retrainingSetupMarkup()
        : html`<div class="choice-grid">
              <button class="choice" data-action="practice-sample">
                <strong>Текст для разминки ↗</strong
                ><span
                  >Спокойная практика на
                  ${esc(language().name === 'English' ? 'английском' : 'выбранном языке')}</span
                ></button
              ><button class="choice" data-action="practice-weak">
                <strong>Трудные клавиши ↗</strong
                ><span>Упражнение на основе ваших последних ошибок</span>
              </button>
              <button class="choice" data-action="retraining-open">
                <strong>Переучиваюсь ↗</strong
                ><span>Выберите клавиши и проверяйте, каким пальцем их нажимаете</span>
              </button>
            </div>
            <form id="practice-form" class="practice-form">
              <label class="field"
                >Ваш текст<textarea
                  id="custom-text"
                  maxlength="3000"
                  placeholder="Вставьте текст, который хотите научиться печатать…"
                >
${esc(customText)}</textarea
                >
              </label>
              <p class="form-note">
                До 3000 символов. Переносы строк будут заменены пробелами. Выберите раскладку
                ${esc(language().layout)} в операционной системе.
              </p>
              <p id="practice-error" class="form-error" role="alert"></p>
              <button class="primary" type="submit">Начать тренировку <span>→</span></button>
            </form>
            ${keyboard()}`}`;
}
function progressPage() {
  const history = data.history.filter((h) => h.language === languageId),
    passed = lessons().filter((l) => completed(l.id)).length,
    total = history.reduce((n, h) => n + h.duration, 0),
    best = Math.max(0, ...history.map((h) => h.speed));
  return html`<div class="breadcrumb">
      Мой прогресс <span>›</span><span class="current">${esc(language().name)}</span>
    </div>
    <p class="eyebrow">КАЖДОЕ НАЖАТИЕ — ШАГ ВПЕРЁД</p>
    <h1>Ваш ритм становится увереннее</h1>
    <p class="subtitle">Результаты завершённых занятий для выбранного языка.</p>
    <div class="progress-cards">
      <div class="progress-card">
        <span>Пройдено уроков</span><b>${passed} <small>/ ${lessons().length}</small></b
        ><small>С точностью от 95%</small>
      </div>
      <div class="progress-card">
        <span>Лучшая скорость</span><b>${best} <small>зн/мин</small></b
        ><small>По завершённым тренировкам</small>
      </div>
      <div class="progress-card">
        <span>Время практики</span><b>${Math.round(total / 60000)} <small>мин</small></b
        ><small>${history.length} завершённых занятий</small>
      </div>
    </div>
    <section class="history-card">
      <h2>История занятий</h2>
      ${history.length
        ? html`<div
              class="history-chart"
              role="img"
              aria-label="Скорость последних ${Math.min(history.length, 10)} занятий: ${history
                .slice(-10)
                .map((h) => h.speed)
                .join(', ')} знаков в минуту"
            >
              ${history
                .slice(-10)
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
            </div>
            <p class="chart-caption">
              Последние занятия · знаков в минуту. Скорость зависит от сложности текста.
            </p>
            <div style="overflow:auto">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Занятие</th>
                    <th>Скорость</th>
                    <th>Точность</th>
                    <th>Другим пальцем</th>
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
                            ${new Intl.DateTimeFormat('ru', {
                              day: '2-digit',
                              month: 'short',
                            }).format(new Date(h.date))}
                          </td>
                          <td>${esc(h.title)}</td>
                          <td>${h.speed} зн/мин</td>
                          <td style="color:${h.accuracy >= 95 ? '#509c87' : '#bf8b64'}">
                            ${h.accuracy}%
                          </td>
                          <td>
                            ${Object.values(h.fingerMarks || {}).reduce((sum, n) => sum + n, 0)}
                          </td>
                        </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
        : html`<div class="empty-state">
            <span class="result-icon">⌁</span>
            <h2>Здесь появится ваша история</h2>
            <p>Завершите первый урок — сохраним точность, скорость и трудные клавиши.</p>
            <button class="primary" data-action="go-learn">Перейти к урокам →</button>
          </div>`}
    </section>
    <div class="row-actions">
      <button class="secondary" data-action="profile">Профиль и перенос данных</button
      ><button class="text-button" data-action="reset-progress">Сбросить историю</button>
    </div>
    <p class="form-note">
      Данные хранятся только в этом браузере. Чтобы продолжить в другом браузере, скачайте файл
      профиля и примените его там.
    </p>
    ${storageAvailable ? '' : '<p class="storage-note">Сохранение в браузере недоступно.</p>'}`;
}
function render() {
  sidebar();
  $('#main').innerHTML =
    view === 'learn' ? learnPage() : view === 'practice' ? practicePage() : progressPage();
  if (session && $('#typing-text')) {
    renderTyping();
    bindInput();
  }
  updateKeyboard();
  bindSettings();
}
function bindSettings() {
  for (const setting of ['colors', 'letters', 'hands'])
    $(`#${setting}`)?.addEventListener('change', (e) => {
      data.settings[setting] = e.target.checked;
      save();
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
  $('#typing-count').textContent = `${session.position} / ${session.text.length} символов`;
  $('#live-accuracy').textContent = `${session.accuracy()}%`;
  if ($('#live-finger-marks'))
    $('#live-finger-marks').textContent = Object.values(session.fingerMarks).reduce(
      (sum, n) => sum + n,
      0,
    );
  $('#pause-button').textContent =
    session.status === 'running'
      ? 'Пауза · Esc'
      : session.status === 'ready'
        ? 'Начать →'
        : session.retry
          ? 'Повторить сочетание →'
          : 'Продолжить →';
  let feedback = session.wrong
    ? 'Ошибка. Нажмите Backspace и попробуйте ещё раз.'
    : session.retry
      ? `Отметили «${session.retry.key.toUpperCase()}»: проверьте исходную позицию и повторите «${session.retry.combo.toUpperCase()}».`
      : session.status === 'running'
        ? 'Печатайте в своём темпе. Смотрите на экран.'
        : session.status === 'paused'
          ? 'Пауза. Время остановлено.'
          : 'Нажмите «Начать», затем печатайте текст выше.';
  if (session.wrong && /[a-z]/i.test(session.lastWrong || '') && languageId === 'ru')
    feedback += ' Проверьте русскую раскладку.';
  if (session.wrong && /[а-яё]/i.test(session.lastWrong || '') && languageId === 'en')
    feedback += ' Проверьте английскую раскладку.';
  $('#typing-feedback').textContent = feedback;
  $('#typing-feedback').parentElement.classList.toggle('error', session.wrong);
  const homeKeys = homePosition(language()).toUpperCase().split(' ');
  $('#pause-cover').innerHTML =
    session.status === 'paused'
      ? session.retry
        ? html`<div class="pause-cover" role="status">
            <strong>Вернитесь в исходную позицию</strong
            ><span
              >Левая рука: ${esc(homeKeys.slice(0, 4).join(' '))} · Правая рука:
              ${esc(homeKeys.slice(4).join(' '))}</span
            ><span
              >Клавиша ${esc(session.retry.key.toUpperCase())}:
              ${esc(fingers[keyInfo(language(), session.retry.key).finger])}</span
            ><span
              >Повторите сочетание: <strong>${esc(session.retry.combo.toUpperCase())}</strong></span
            ><button class="primary" data-action="pause">Повторить сочетание →</button>
          </div>`
        : '<div class="pause-cover"><strong>Небольшая пауза</strong><button class="primary" data-action="pause">Продолжить →</button></div>'
      : '';
  updateClock();
  updateKeyboard(handOptions);
}
function updateClock() {
  if (!session || !$('#live-time')) return;
  const seconds = Math.floor(session.time() / 1000);
  $('#live-time').textContent =
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('#live-speed').textContent = session.attempts ? session.speed() : 0;
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
    info = keyInfo(language(), expected || '');
  document.querySelectorAll('.key.next').forEach((k) => k.classList.remove('next'));
  if (info) {
    $(`[data-key="${info.row}-${info.col}"]`)?.classList.add('next');
    if (info.row === 4) $('#space-key')?.classList.add('next');
    if (info.shift) $(info.finger < 4 ? '#shift-right' : '#shift-left')?.classList.add('next');
  }
  if ($('#finger-hint'))
    $('#finger-hint').innerHTML = info
      ? html`<span class="hint-symbol">→</span>
          <strong
            >${esc(expected === ' ' ? 'Пробел' : expected?.toUpperCase() || '')} ·
            ${fingers[info.finger]}</strong
          >${info.shift ? ` + ${info.finger < 4 ? 'правый' : 'левый'} Shift` : ''}`
      : '<span class="hint-symbol">→</span> Каждому пальцу — своя зона.';
  updateHandOverlay(info, expected, handOptions);
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
      ? `Положение рук: ${expected === ' ' ? 'пробел' : expected}, ${fingers[info.finger]}${info.shift ? `, ${info.finger < 4 ? 'правый' : 'левый'} Shift` : ''}`
      : 'Исходная позиция обеих рук над клавиатурой',
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
    toast('В упражнении текст нужно набрать вручную.');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (session.status !== 'running') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      session.backspace();
      renderTyping();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && !e.isComposing) {
      e.preventDefault();
      if (e.repeat) return;
      processChar(e.key);
    }
  });
  input.addEventListener('input', (e) => {
    if (!e.isComposing) {
      const chars = Array.from(input.value);
      input.value = '';
      for (const c of chars) processChar(c);
    }
  });
  input.addEventListener('compositionend', () => {
    const chars = Array.from(input.value);
    input.value = '';
    for (const c of chars) processChar(c);
  });
  input.addEventListener('blur', (e) => {
    if (e.relatedTarget?.closest('[data-action="pause"], [data-action="mark-finger"]')) return;
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
        ? 'Сначала исправьте опечатку клавишей Backspace.'
        : 'Сначала напечатайте клавишу.',
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
  if (session.status === 'running') session.pause();
  else if (['ready', 'paused'].includes(session.status)) session.start();
  renderTyping();
  if (session.status === 'running') $('#typing-input').focus({ preventScroll: true });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session?.status === 'running') {
    session.pause();
    renderTyping();
  }
});
function startLesson() {
  stopSession();
  sessionKind = 'lesson';
  sessionLesson = lesson().id;
  sessionTitle = lesson().title;
  session = new TypingSession(lesson().text);
  tab = 'training';
  render();
  session.start();
  renderTyping();
  $('#typing-input').focus({ preventScroll: true });
}
function startPractice(text, title, kind = 'practice') {
  stopSession();
  sessionKind = kind;
  sessionLesson = null;
  sessionTitle = title;
  session = new TypingSession(text);
  retrainingSetup = false;
  view = 'practice';
  render();
  session.start();
  renderTyping();
  $('#typing-input').focus({ preventScroll: true });
}
function modal(content) {
  $('#dialog-content').innerHTML = content;
  if (!$('#dialog').open) $('#dialog').showModal();
}
function closeModal() {
  $('#dialog').close();
}
function finish() {
  const result = {
    date: new Date().toISOString(),
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
  };
  data.history.push(result);
  data.history = data.history.slice(-500);
  if (result.kind === 'lesson') {
    data.progress[languageId] ??= {};
    data.progress[languageId][result.lesson] = Math.max(
      data.progress[languageId][result.lesson] || 0,
      result.accuracy,
    );
  }
  save();
  sidebar();
  const passed = result.accuracy >= 95,
    fingerMarkCount = Object.values(result.fingerMarks).reduce((sum, n) => sum + n, 0),
    weak = Object.entries(session.mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    next = sessionKind === 'lesson' && lessonIndex < lessons().length - 1;
  modal(
    html`<div class="result-icon">${passed ? '✦' : '⌁'}</div>
      <h1 class="result-heading">
        ${sessionKind === 'retraining'
          ? 'Короткая тренировка завершена'
          : passed
            ? 'Отлично, ритм найден!'
            : 'Уже ближе к уверенной печати'}
      </h1>
      <p class="dialog-subtitle" style="text-align:center">
        ${sessionKind === 'lesson'
          ? passed
            ? 'Урок пройден. Можно двигаться дальше.'
            : 'Для прохождения урока нужна точность от 95%. Попробуйте ещё раз без спешки.'
          : 'Тренировка завершена. Результат сохранён.'}
      </p>
      <div class="result-stats">
        <div><b>${result.accuracy}%</b><span>точность</span></div>
        <div><b>${result.speed}</b><span>знаков / мин</span></div>
        <div><b>${Math.round(result.duration / 1000)} с</b><span>активное время</span></div>
        ${sessionKind === 'retraining'
          ? html`<div><b>${fingerMarkCount}</b><span>отметок другого пальца</span></div>`
          : ''}
      </div>
      <div class="result-note">
        ${weak.length
          ? html`Стоит повторить:
              <strong
                >${weak
                  .map(([c, n]) => `${esc(c === ' ' ? 'пробел' : c)} (${n})`)
                  .join(', ')}</strong
              >. Упражнение на эти клавиши доступно в разделе «Практика».`
          : sessionKind === 'retraining' && fingerMarkCount
            ? 'Опечаток нет. Отмеченные движения пальцев можно повторить в следующем упражнении.'
            : 'Ни одной ошибки. Сохраните этот спокойный темп в следующем упражнении.'}<br />Скорость:
        правильно набранные символы ÷ активное время в минутах. Точность учитывает все попытки,
        включая исправленные ошибки.
        ${sessionKind === 'retraining'
          ? 'Отметки другого пальца сохранены отдельно и не снижают точность.'
          : ''}
      </div>
      <div class="result-actions">
        <button class="secondary" data-action="repeat">Повторить</button>${next && passed
          ? '<button class="primary" data-action="next">Следующий урок →</button>'
          : '<button class="primary" data-action="show-progress">Мой прогресс →</button>'}${weak.length
          ? '<button class="text-button" data-action="practice-weak">Трудные клавиши</button>'
          : ''}
      </div>`,
  );
}
function normalizeText(t) {
  return t.replace(/\s+/g, ' ').trim();
}
function validateText(t) {
  const bad = [...new Set(Array.from(t).filter((c) => !keyInfo(language(), c)))];
  return bad.length
    ? `В выбранной раскладке нет символов: ${bad.slice(0, 10).join(' ')}. Измените текст или выберите другой язык.`
    : '';
}
function weakPractice() {
  const mistakes = {};
  for (const h of data.history.filter((h) => h.language === languageId).slice(-10))
    for (const [c, n] of Object.entries(h.mistakes || {}))
      if (c !== ' ' && keyInfo(language(), c)) mistakes[c] = (mistakes[c] || 0) + n;
  const chars = Object.keys(mistakes)
    .sort((a, b) => mistakes[b] - mistakes[a])
    .slice(0, 6)
    .join('');
  if (!chars) {
    toast('Пока нет трудных клавиш. Начнём с исходной позиции.');
    startPractice(drill(lessons()[0].keys), 'Повторение исходной позиции');
  } else startPractice(drill(chars, 30), 'Трудные клавиши');
}
function addLanguage() {
  modal(
    html`<p class="eyebrow">НОВАЯ РАСКЛАДКА</p>
      <h2>Добавить язык</h2>
      <p class="dialog-subtitle">
        Для клавиатуры с тремя рядами букв. Создадим восемь уроков: от исходной позиции до вашего
        текста. Новая раскладка сохранится в этом браузере.
      </p>
      <form id="language-form">
        <label class="field"
          >Название языка<input
            name="name"
            maxlength="30"
            required
            placeholder="Например, Deutsch" /></label
        ><label class="field"
          >Верхний ряд · 12 клавиш<input
            name="top"
            required
            placeholder="qwertzuiopü+"
            minlength="12"
            maxlength="12"
            spellcheck="false" /></label
        ><label class="field"
          >Основной ряд · 11 клавиш<input
            name="home"
            required
            placeholder="asdfghjklöä"
            minlength="11"
            maxlength="11"
            spellcheck="false" /></label
        ><label class="field"
          >Нижний ряд · 10 клавиш<input
            name="bottom"
            required
            placeholder="yxcvbnm,.-"
            minlength="10"
            maxlength="10"
            spellcheck="false"
        /></label>
        <details>
          <summary style="font-size:12px;color:#788398;cursor:pointer;margin-bottom:15px">
            Настроить ряд цифр и Shift
          </summary>
          <label class="field"
            >Ряд цифр · 13 клавиш<input
              name="numbers"
              minlength="13"
              maxlength="13"
              placeholder="^1234567890ß´"
              spellcheck="false" /></label
          ><label class="field"
            >Ряд цифр с Shift · 13 символов<input
              name="numberShift"
              minlength="13"
              maxlength="13"
              placeholder='°!"§$%&amp;/()=?&#96;'
              spellcheck="false" /></label
          ><label class="field"
            >Верхний ряд с Shift · 12 символов<input
              name="topShift"
              minlength="12"
              maxlength="12"
              spellcheck="false" /></label
          ><label class="field"
            >Основной ряд с Shift · 11 символов<input
              name="homeShift"
              minlength="11"
              maxlength="11"
              spellcheck="false" /></label
          ><label class="field"
            >Нижний ряд с Shift · 10 символов<input
              name="bottomShift"
              minlength="10"
              maxlength="10"
              spellcheck="false"
          /></label>
        </details>
        <label class="field"
          >Учебный текст<textarea
            name="text"
            required
            maxlength="1500"
            placeholder="Текст на новом языке с символами указанной раскладки"
          ></textarea>
        </label>
        <p class="form-note">
          Вводите символы без пробелов, слева направо. Верхний ряд начинается с клавиши под «1»,
          основной — справа от Caps Lock. По умолчанию ряд цифр английский, Shift превращает буквы в
          заглавные. Если знаки отличаются, укажите их в дополнительных настройках.
        </p>
        <p class="form-error" id="language-error" role="alert"></p>
        <button class="primary" type="submit">Добавить и начать →</button>
      </form>`,
  );
}
function openProfile() {
  if (session?.status === 'running') {
    session.pause();
    renderTyping();
  }
  pendingImport = null;
  importRequest++;
  modal(
    html`<p class="eyebrow">ВАШ ЛИЧНЫЙ РИТМ</p>
      <h2>Профиль и перенос данных</h2>
      <p class="dialog-subtitle">
        Профиль, настройки и прогресс хранятся в этом браузере. Файл переноса позволяет продолжить
        занятия в другом браузере или на другом компьютере.
      </p>
      <form id="profile-form">
        <label class="field"
          >Ваше имя<input
            id="profile-name"
            maxlength="40"
            value="${esc(data.profile.name)}"
            placeholder="Как к вам обращаться?"
            autocomplete="nickname"
        /></label>
        <div class="profile-options">
          ${[
            ['colors', 'Цветные зоны пальцев'],
            ['letters', 'Буквы на клавишах'],
            ['hands', 'Показать руки над клавиатурой'],
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
        </div>
        <p id="profile-save-state" class="form-note" role="status">
          Изменения сохраняются автоматически.
        </p>
      </form>
      <section class="transfer-section">
        <h3>Перенести в другой браузер</h3>
        <p class="form-note">
          1. Скачайте файл здесь. 2. Откройте Ритм в новом браузере. 3. Выберите этот файл и нажмите
          «Применить файл».
        </p>
        <button class="secondary" data-action="export">Скачать файл профиля</button
        ><label class="field import-field"
          >Применить файл из другого браузера<input
            id="import-file"
            type="file"
            accept=".json,application/json"
        /></label>
        <p class="form-note">
          В файле: имя, настройки подсказок, выбранные языки и уроки, прогресс, история и
          добавленные раскладки. Файл читается прямо в браузере.
        </p>
        <p id="import-error" class="form-error" role="alert"></p>
        <div id="import-preview"></div>
      </section>`,
  );
  $('#profile-name').addEventListener('input', saveProfileInputs);
  for (const key of ['colors', 'letters', 'hands'])
    $(`#profile-${key}`).addEventListener('change', saveProfileInputs);
  $('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveProfileInputs();
  });
  $('#import-file').addEventListener('change', readImport);
}
function saveProfileInputs() {
  data.profile.name = $('#profile-name').value.trim();
  for (const key of ['colors', 'letters', 'hands']) {
    data.settings[key] = $(`#profile-${key}`).checked;
    if ($(`#${key}`)) $(`#${key}`).checked = data.settings[key];
  }
  $('.keyboard')?.classList.toggle('colored', data.settings.colors);
  $('.keyboard')?.classList.toggle('no-letters', !data.settings.letters);
  updateKeyboard();
  $('#profile-save-state').textContent = save()
    ? 'Сохранено в этом браузере.'
    : 'Сохранение недоступно. Можно скачать файл профиля.';
  $('#profile-label').textContent = data.profile.name || 'Мой профиль';
  $('#profile-avatar').textContent = Array.from(data.profile.name || 'Я')[0].toUpperCase();
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast(`Не удалось создать файл: ${error.message}`);
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
    if (file.size > 2 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум — 2 МБ.');
    const contents = await file.text();
    if (request !== importRequest || !$('#import-preview')) return;
    let parsed;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new Error('Не удалось прочитать JSON. Выберите файл, скачанный из Ритма.');
    }
    pendingImport = parseBackup(parsed);
    const passed = Object.values(pendingImport.progress).reduce(
      (total, records) => total + Object.values(records).filter((a) => a >= 95).length,
      0,
    );
    $('#import-preview').innerHTML = html`<div class="import-preview">
      <h3>Файл готов к применению</h3>
      <p>
        <strong>${esc(pendingImport.profile.name || 'Профиль без имени')}</strong> · ${passed}
        пройденных уроков · ${pendingImport.history.length} занятий ·
        ${Object.keys(pendingImport.customLanguages).length} добавленных раскладок
      </p>
      <p class="form-note">
        ${esc(file.name)}<br />Заменит профиль, настройки и прогресс в этом браузере. До применения
        можно скачать текущий профиль.
      </p>
      <button class="primary" data-action="apply-import">Применить файл →</button>
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
    $('#import-error').textContent =
      'Не удалось сохранить файл в браузере. Текущие данные не изменены. Проверьте доступ к хранилищу и свободное место.';
    return;
  }
  stopSession();
  data = pendingImport;
  pendingImport = null;
  importRequest++;
  storageAvailable = true;
  languages = { ...builtinLanguages, ...data.customLanguages };
  languageId = data.selected;
  lessonIndex = data.lessons[languageId] || 0;
  sessionTitle = '';
  tab = 'lecture';
  view = 'progress';
  closeModal();
  render();
  toast('Профиль, настройки и прогресс перенесены.');
}
const actions = {
  'hand-demo': () => {
    data.settings.hands = true;
    save();
    if ($('#hands')) $('#hands').checked = true;
    const expected = session?.text[session.position] || lesson().text[0];
    updateHandOverlay(keyInfo(language(), expected), expected, { demo: true });
  },
  'start-lesson': startLesson,
  pause: togglePause,
  repeat: () => {
    const text = session?.text,
      title = sessionTitle,
      kind = sessionKind;
    closeModal();
    if (kind === 'lesson') startLesson();
    else if (text) startPractice(text, title, kind);
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
    startPractice(retrainingDrill(language(), keys), 'Переучиваюсь', 'retraining');
  },
  'mark-finger': markWrongFinger,
  'practice-sample': () => startPractice(language().text, 'Текст для разминки'),
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
      '<h2>Сбросить историю занятий?</h2><p class="dialog-subtitle">Будут удалены результаты всех языков в этом браузере. Добавленные раскладки останутся. Перед сбросом можно скачать прогресс.</p><div class="row-actions"><button class="secondary" data-action="export">Скачать прогресс</button><button class="primary" data-action="confirm-reset">Удалить историю</button></div>',
    ),
  'confirm-reset': () => {
    data.history = [];
    data.progress = {};
    data.fingerMarks = {};
    save();
    closeModal();
    render();
    toast('История занятий сброшена.');
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
      toast('Можно выбрать до 8 клавиш для короткого упражнения.');
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
    html`<p class="eyebrow">ПЕЧАТАЙТЕ СПОКОЙНО</p>
      <h2>Как заниматься с Ритмом</h2>
      <p class="dialog-subtitle">
        Выбор языка в тренажёре не переключает системную раскладку. Перед началом переключите её в
        операционной системе.
      </p>
      ${hands()}${basics()}
      <div class="row-actions">
        <button class="secondary" data-action="add-language">+ Добавить язык</button>
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
  if (e.target.id === 'practice-form') {
    e.preventDefault();
    customText = $('#custom-text').value;
    const t = normalizeText(customText),
      error = !t ? 'Добавьте текст для практики.' : validateText(t);
    if (error) {
      $('#practice-error').textContent = error;
      return;
    }
    startPractice(t, 'Свой текст');
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
    if (!name || !text) return error('Укажите название и учебный текст.');
    if (rows.some((r, i) => Array.from(r).length !== [13, 12, 11, 10][i] || /\s/.test(r)))
      return error('Проверьте количество клавиш: 13, 12, 11 и 10, без пробелов.');
    if (new Set(Array.from(rows.join(''))).size !== Array.from(rows.join('')).length)
      return error('Символы клавиш не должны повторяться между рядами.');
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
      return error('Ряды с Shift должны совпадать по длине с основными рядами.');
    const l = { name, layout: name, rows, shift, text, custom: true };
    const bad = Array.from(text).filter((c) => !keyInfo(l, c));
    if (bad.length)
      return error(
        `В тексте есть символы вне раскладки: ${[...new Set(bad)].slice(0, 10).join(' ')}.`,
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
    toast('Язык добавлен. Начните с исходной позиции.');
  }
});
lessonIndex = Math.min(lessonIndex, lessons().length - 1);
render();
if (loadError) toast('Не удалось прочитать сохранённый профиль. Можно восстановить его из файла.');
else save();
