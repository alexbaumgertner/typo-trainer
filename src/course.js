export const builtinLanguages = {
  ru: {
    name: 'Русский',
    layout: 'ЙЦУКЕН',
    rows: ['ё1234567890-=', 'йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю.'],
    shift: ['Ё!"№;%:?*()_+', 'ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ,'],
    groups: [
      'ао',
      'вл',
      'ыд',
      'фж',
      'прэ',
      'лад вал дар два вода фара дрова повар подвал правда',
      'укгш',
      'цщен',
      'йзхъё',
      'кошка школа река урок гора город парк корова поезд ещё',
      'мить',
      'сбчю',
      'я.',
      '1234567890-=',
      'А О Ф Ж',
    ],
    text: 'У каждого дела есть свой ритм. Начните спокойно, найдите исходную позицию и смотрите на экран. Пальцы постепенно запомнят клавиши, а точные движения станут привычкой.',
  },
  en: {
    name: 'English',
    layout: 'QWERTY',
    rows: ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'],
    shift: ['~!@#$%^&*()_+', 'QWERTYUIOP{}', 'ASDFGHJKL:"', 'ZXCVBNM<>?'],
    groups: [
      'fj',
      'dk',
      'sl',
      'a;',
      "gh'",
      'fall ask sad lad flask salad glass hall dash ash',
      'rtyu',
      'eiwo',
      'qp[]`',
      'the quiet writer reads a page of old words',
      'vbnm',
      'c,x.',
      'z/',
      '1234567890-=',
      'A F J K',
    ],
    text: 'Every skill starts with a small step. Keep your eyes on the screen and let your hands find their way. Practice with care, take a short break, and enjoy the steady rhythm of each new line.',
  },
};
export const fingers = [
  'Левый мизинец',
  'Левый безымянный',
  'Левый средний',
  'Левый указательный',
  'Правый указательный',
  'Правый средний',
  'Правый безымянный',
  'Правый мизинец',
  'Большой палец',
];
export const fingerClasses = [
  'pinky',
  'ring',
  'middle',
  'index',
  'index',
  'middle',
  'ring',
  'pinky',
  'thumb',
];
export const zoneRows = [
  [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7],
];
export function keyInfo(language, char) {
  if (char === ' ') return { finger: 8, row: 4, col: 0, shift: false, label: 'Пробел' };
  for (let row = 0; row < 4; row++) {
    let col = Array.from(language.rows[row]).indexOf(char);
    if (col >= 0) return { finger: zoneRows[row][col], row, col, shift: false, label: char };
  }
  for (let row = 0; row < 4; row++) {
    const col = Array.from(language.shift[row] || '').indexOf(char);
    if (col >= 0)
      return { finger: zoneRows[row][col], row, col, shift: true, label: language.rows[row][col] };
  }
  return null;
}
const titles = [
  'Исходная позиция',
  'Средние пальцы',
  'Безымянные пальцы',
  'Мизинцы',
  'Весь основной ряд',
  'Первые слова',
  'Верхний ряд · центр',
  'Верхний ряд · движение',
  'Верхний ряд · края',
  'Слова и сочетания',
  'Нижний ряд · центр',
  'Нижний ряд · движение',
  'Нижний ряд · края',
  'Цифры и символы',
  'Shift и заглавные',
  'Связный текст',
];
const focuses = [
  'Найдите выступы под указательными пальцами. Нажмите клавишу мягко и отпустите. Чередуйте руки, остальные пальцы оставляйте над исходными клавишами.',
  'Средние пальцы остаются над своими клавишами основного ряда. Не поворачивайте кисть вслед за пальцем: достаточно короткого движения вниз.',
  'У безымянного пальца меньше независимости. Не торопите его: нажимайте легко, возвращайтесь в исходную позицию и держите плечи расслабленными.',
  'Мизинцам тоже нужна практика. Не растягивайте кисти и не переносите всю руку при нажатии. Клавиши у края нажимайте коротким движением.',
  'Указательные пальцы обслуживают по две колонки. Для центральной клавиши сделайте движение в сторону, затем вернитесь на клавишу с выступом.',
  'Собирайте знакомые движения в слова. Смотрите на слово немного вперёд, пробел нажимайте удобным большим пальцем. Сохраняйте равномерный ритм.',
  'Для верхнего ряда переместите нужный палец вверх, слегка разогнув его. После нажатия возвращайтесь на основной ряд. Остальные пальцы не должны следовать за ним.',
  'Увеличиваем расстояние движения. Перед нажатием мысленно представьте клавишу, переместите только нужный палец и верните его к исходной позиции.',
  'Края верхнего ряда обслуживают мизинцы. Двигайтесь без напряжения, сохраняйте положение кистей. Если клавиша далеко, небольшое движение руки допустимо.',
  'Соединяем основной и верхний ряды. Воспринимайте сочетания букв как последовательность движений. Снизьте темп там, где часто ошибаетесь.',
  'К нижнему ряду палец немного сгибается. Указательные обслуживают центральные колонки. После каждого движения возвращайте пальцы к выступам.',
  'Средние и безымянные пальцы двигаются вниз по своим зонам. Не прижимайте ладони к столу во время печати и не тянитесь к букве соседним пальцем.',
  'Мизинцы завершают нижний ряд. Запоминайте движение к краю клавиатуры. Точка — отдельное точное нажатие, затем следует пробел.',
  'Цифры лежат дальше букв. Найдите их по цветной схеме и вернитесь к основному ряду. Не спешите: сначала важно запомнить расстояние и свой палец.',
  'Shift удерживает мизинец противоположной руки: для буквы левой рукой — правый Shift, для правой — левый. Отпустите Shift сразу после заглавной буквы.',
  'Печатайте связный текст с ровным ритмом. Взгляд направляйте на экран и читайте на слово вперёд. Сначала точность, затем скорость; делайте паузы при усталости.',
];
export function drill(keys, count = 24) {
  const letters = Array.from(keys.replaceAll(' ', ''));
  if (!letters.length) return '';
  return Array.from({ length: count }, (_, i) => {
    const a = letters[i % letters.length],
      b = letters[(i + 1) % letters.length];
    return [a + a, a + b, b + a, a + b + a][i % 4];
  }).join(' ');
}
const homeColumns = [0, 1, 2, 3, 6, 7, 8, 9];
export function homePosition(language) {
  return homeColumns.map((col) => language.rows[2][col]).join(' ');
}
export function retrainingDrill(language, keys) {
  const homes = homeColumns.map((col) => language.rows[2][col]);
  return Array.from({ length: keys.length * 2 }, (_, index) => {
    const key = keys[index % keys.length];
    const finger = keyInfo(language, key)?.finger;
    if (finger === undefined || finger === 8) throw new Error('Неизвестная клавиша упражнения.');
    const home = homes[finger];
    return home + key + home;
  }).join(' ');
}
export function lessonsFor(l) {
  if (l.custom) {
    const home = l.rows[2];
    const groups = [
      home[3] + home[6],
      home[2] + home[7],
      home[1] + home[8],
      home[0] + home[9],
      home,
      l.rows[1],
      l.rows[3],
      l.text,
    ];
    return groups.map((g, i) => ({
      id: i,
      title: [
        'Исходная позиция',
        'Средние пальцы',
        'Безымянные пальцы',
        'Мизинцы',
        'Основной ряд',
        'Верхний ряд',
        'Нижний ряд',
        'Связный текст',
      ][i],
      keys: i === 7 ? '' : g,
      text: i === 7 ? l.text : drill(g),
      focus: focuses[[0, 1, 2, 3, 4, 6, 10, 15][i]],
      section: i < 5 ? 'ОСНОВА' : i < 7 ? 'ВСЯ КЛАВИАТУРА' : 'ТЕКСТ',
    }));
  }
  return titles.map((title, i) => {
    let text;
    if (i === 15) text = l.text;
    else if ([5, 9].includes(i)) text = (l.groups[i] + ' ' + l.groups[i]).trim();
    else if (i === 14)
      text =
        l === builtinLanguages.ru
          ? 'Аа Оо Фа Жа. Лада дома. Вода в реке, книга на столе. Как дела? Хорошо!'
          : 'Aa Ff Jj Kk. A good day. Jane reads a book, Fred takes a walk. How are you? Fine!';
    else {
      text = drill(l.groups[i], i < 5 ? 20 : 24);
      if (i > 0 && i < 5) text += ' ' + drill(l.groups.slice(0, i + 1).join(''), 8);
    }
    return {
      id: i,
      title,
      keys: [5, 9, 15].includes(i) ? '' : l.groups[i].replaceAll(' ', ''),
      text,
      focus: focuses[i],
      section:
        i < 6
          ? '01 · ОСНОВНОЙ РЯД'
          : i < 10
            ? '02 · ВЕРХНИЙ РЯД'
            : i < 13
              ? '03 · НИЖНИЙ РЯД'
              : '04 · УВЕРЕННАЯ ПЕЧАТЬ',
    };
  });
}
export class TypingSession {
  constructor(text) {
    this.text = text;
    this.position = 0;
    this.attempts = 0;
    this.errors = 0;
    this.wrong = false;
    this.mistakes = {};
    this.fingerMarks = {};
    this.retry = null;
    this.elapsed = 0;
    this.started = null;
    this.status = 'ready';
  }
  start(now = performance.now()) {
    this.retry = null;
    this.status = 'running';
    if (this.attempts) this.started = now;
  }
  pause(now = performance.now()) {
    if (this.started !== null) this.elapsed += now - this.started;
    this.started = null;
    this.status = 'paused';
  }
  time(now = performance.now()) {
    return this.elapsed + (this.started !== null ? now - this.started : 0);
  }
  type(char, now = performance.now()) {
    if (this.status !== 'running' || this.wrong || this.position >= this.text.length) return false;
    if (this.started === null) this.started = now;
    this.attempts++;
    if (char !== this.text[this.position]) {
      this.errors++;
      this.wrong = true;
      const expected = this.text[this.position];
      this.mistakes[expected] = (this.mistakes[expected] || 0) + 1;
      return false;
    }
    this.position++;
    if (this.position === this.text.length) {
      this.pause(now);
      this.status = 'done';
    }
    return true;
  }
  backspace() {
    if (this.status === 'running') {
      if (this.wrong) this.wrong = false;
      else this.position = Math.max(0, this.position - 1);
    }
  }
  markWrongFinger(now = performance.now()) {
    if (this.status !== 'running' || this.wrong || this.position === 0) return null;
    let last = this.position - 1;
    while (last > 0 && this.text[last] === ' ') last--;
    const from = this.text.lastIndexOf(' ', last - 1) + 1;
    const nextSpace = this.text.indexOf(' ', last);
    const to = nextSpace < 0 ? this.text.length : nextSpace;
    const key = this.text[last];
    const combo = this.text.slice(from, to);
    this.fingerMarks[key] = (this.fingerMarks[key] || 0) + 1;
    this.retry = { key, combo };
    this.position = from;
    this.pause(now);
    return this.retry;
  }
  accuracy() {
    return this.attempts
      ? Math.round((1000 * (this.attempts - this.errors)) / this.attempts) / 10
      : 100;
  }
  speed(now = performance.now()) {
    const minutes = this.time(now) / 60000;
    return minutes > 0 ? Math.round(this.position / minutes) : 0;
  }
}
