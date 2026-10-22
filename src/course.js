import { t } from './i18n.js';
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
  uk: {
    name: 'Українська',
    locale: 'uk',
    layout: 'ЙЦУКЕН · UA',
    iso: true,
    rows: ["'1234567890-=", 'йцукенгшщзхї', 'фівапролджє', 'ґячсмитьбю.'],
    shift: ['ʼ!"№;%:?*()_+', 'ЙЦУКЕНГШЩЗХЇ', 'ФІВАПРОЛДЖЄ', 'ҐЯЧСМИТЬБЮ,'],
    groups: [
      'ао',
      'вл',
      'ід',
      'фж',
      'прє',
      'дар два вода фара правда',
      'укгш',
      'цщен',
      "йзхї'",
      'школа ріка урок гора парк поїзд',
      'мить',
      'сбчю',
      'ґя.',
      '1234567890-=',
      'А О І Ї',
    ],
    capitals: 'Аа Іі Її Єє Ґґ. Лада вдома. Вода в річці. Як справи? Добре!',
    text: "Кожна справа має свій ритм. Дивіться на екран і друкуйте спокійно. Ґанок біля дому, м'яка тінь і теплий день. Ваші пальці запам'ятають рухи. Точність важливіша за швидкість.",
  },
  de: {
    name: 'Deutsch',
    locale: 'de',
    layout: 'QWERTZ · DE',
    iso: true,
    rows: ['^1234567890ß´', 'qwertzuiopü+', 'asdfghjklöä#', '<yxcvbnm,.-'],
    shift: ['°!"§$%&/()=?`', 'QWERTZUIOPÜ*', "ASDFGHJKLÖÄ'", '>YXCVBNM;:_'],
    groups: [
      'fj',
      'dk',
      'sl',
      'aö',
      'ghä#',
      'das all als glas saal fass',
      'rtzu',
      'eiwo',
      'qpü+',
      'die frau liest das wort auf der seite',
      'vbnm',
      'c,x.',
      '<y-',
      '1234567890ß',
      'A F J Ö',
    ],
    capitals: 'Aa Öö Ää Üü. Das ist ein guter Tag. Jörg liest ein Buch. Wie geht es dir? Gut!',
    text: 'Jeder Schritt braucht Zeit. Übe ruhig und schaue auf den Bildschirm. Die Hände bleiben locker. Draußen ist es schön. Mit jedem Satz wächst dein Gefühl für den Rhythmus.',
  },
  tr: {
    name: 'Türkçe',
    locale: 'tr',
    layout: 'Q · TR',
    iso: true,
    rows: ['"1234567890*-', 'qwertyuıopğü', 'asdfghjklşi,', '<zxcvbnmöç.'],
    shift: ["é!'^+%&/()=?_", 'QWERTYUIOPĞÜ', 'ASDFGHJKLŞİ;', '>ZXCVBNMÖÇ:'],
    groups: [
      'fj',
      'dk',
      'sl',
      'aş',
      'ghi,',
      'şaka laf kal al sal',
      'rtyu',
      'eıwo',
      'qpğü',
      'iyi işler kolay olur kişi işe gider',
      'vbnm',
      'cöxç',
      '<z.',
      '1234567890*-',
      'İ I Ş Ğ',
    ],
    capitals: 'İi Iı Şş Ğğ Üü Öö Çç. İpek kitap okur. Işık odaya girer. Bugün güzel bir gün!',
    text: 'Her iş küçük bir adımla başlar. Ekrana bak ve sakin bir şekilde yaz. Doğru tuşa basmak hızdan önemlidir. Işık, ağaç ve gökyüzü bize ilham verir. Yorulunca kısa bir ara ver.',
  },
  fr: {
    name: 'Français',
    locale: 'fr',
    layout: 'AZERTY · FR',
    iso: true,
    rows: ['²&é"\'(-è_çà)=', 'azertyuiop^$', 'qsdfghjklmù*', '<wxcvbn,;:!'],
    shift: ['~1234567890°+', 'AZERTYUIOP¨£', 'QSDFGHJKLM%µ', '>WXCVBN?./§'],
    compositions: {
      â: '^a',
      ê: '^e',
      î: '^i',
      ô: '^o',
      û: '^u',
      ë: '¨e',
      ï: '¨i',
      ü: '¨u',
      ÿ: '¨y',
      Â: '^A',
      Ê: '^E',
      Î: '^I',
      Ô: '^O',
      Û: '^U',
      Ë: '¨E',
      Ï: '¨I',
      Ü: '¨U',
      Ÿ: '¨Y',
    },
    groups: [
      'fj',
      'dk',
      'sl',
      'qm',
      'ghù*',
      'fff jjj ddd kkk sss lll qqq mmm',
      'rtyu',
      'ezio',
      'ap$',
      'le jour et la fille qui regarde la rue',
      'vbn,',
      'c;x:',
      '<w!',
      '0123456789éèçà',
      'A F J M',
    ],
    capitals: 'Aa Ff Jj Mm. Le jour se lève. Julie lit un livre. Comment allez-vous? Très bien!',
    text: "Chaque geste a son rythme. Regardez l'écran et gardez les mains détendues. La forêt est calme et le ciel est bleu. Un peu de pratique chaque jour aide à écrire avec précision.",
  },
  es: {
    name: 'Español',
    locale: 'es',
    layout: 'QWERTY · ES',
    iso: true,
    rows: ["º1234567890'¡", 'qwertyuiop`+', 'asdfghjklñ´ç', '<zxcvbnm,.-'],
    shift: ['ª!"·$%&/()=?¿', 'QWERTYUIOP^*', 'ASDFGHJKLÑ¨Ç', '>ZXCVBNM;:_'],
    compositions: {
      á: '´a',
      é: '´e',
      í: '´i',
      ó: '´o',
      ú: '´u',
      ü: '¨u',
      Á: '´A',
      É: '´E',
      Í: '´I',
      Ó: '´O',
      Ú: '´U',
      Ü: '¨U',
    },
    groups: [
      'fj',
      'dk',
      'sl',
      'añ',
      'ghç',
      'ala sala las alas sal',
      'rtyu',
      'eiwo',
      'qp+',
      'ella quiere leer y salir',
      'vbnm',
      'c,x.',
      '<z-',
      '1234567890',
      'A F J Ñ',
    ],
    capitals: 'Aa Ññ Áá Éé Íí Óó Úú Üü. Ana lee un libro. ¿Cómo estás? ¡Muy bien!',
    text: 'Cada día es una nueva oportunidad. Mira la pantalla y escribe con calma. El pequeño pájaro vuela sobre el jardín. La práctica ayuda a mejorar la precisión. Descansa cuando lo necesites.',
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
export function fingerAt(language, row, col) {
  if (language.iso && row === 3) return col === 0 ? 0 : zoneRows[row][col - 1];
  return zoneRows[row][col] ?? 7;
}
export function keyLabel(language, char) {
  // Never expand ß to SS; Turkish i and ı have distinct uppercase forms.
  if (char.length > 1) return Array.from(char, (c) => keyLabel(language, c)).join('');
  const upper = char.toLocaleUpperCase(language.locale || 'en');
  return upper.length === 1 && keyInfo(language, upper) ? upper : char;
}
export function keyInfo(language, char) {
  const sequence = language.compositions?.[char];
  if (sequence) return { ...keyInfo(language, sequence[1]), deadKey: sequence[0] };
  if (char === ' ') return { finger: 8, row: 4, col: 0, shift: false, label: 'Пробел' };
  for (let row = 0; row < 4; row++) {
    let col = Array.from(language.rows[row]).indexOf(char);
    if (col >= 0)
      return { finger: fingerAt(language, row, col), row, col, shift: false, label: char };
  }
  for (let row = 0; row < 4; row++) {
    const col = Array.from(language.shift[row] || '').indexOf(char);
    if (col >= 0)
      return {
        finger: fingerAt(language, row, col),
        row,
        col,
        shift: true,
        label: language.rows[row][col],
      };
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
export function seededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.codePointAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function drill(keys, count = 24, seed = keys) {
  const letters = [...new Set([...keys].filter((char) => char !== ' '))];
  if (!letters.length) return '';
  const rng = seededRandom(seed),
    used = new Map(),
    pairs = new Map(),
    output = [];
  for (let i = 0; i < count * 3; i++) {
    const fewest = Math.min(...letters.map((char) => used.get(char) || 0));
    const previous = output.at(-1);
    const char = letters
      .filter((candidate) => (used.get(candidate) || 0) === fewest)
      .map((candidate) => ({
        candidate,
        score: (pairs.get(`${previous}:${candidate}`) || 0) + rng(),
      }))
      .sort((a, b) => a.score - b.score)[0].candidate;
    output.push(char);
    used.set(char, (used.get(char) || 0) + 1);
    pairs.set(`${previous}:${char}`, (pairs.get(`${previous}:${char}`) || 0) + 1);
  }
  let text = '',
    boundary = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < output.length; i++) {
    if (i === boundary) {
      text += ' ';
      boundary = i + 2 + Math.floor(rng() * 3);
    }
    text += output[i];
  }
  return text;
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
    if (finger === undefined || finger === 8) throw new Error(t('Неизвестная клавиша упражнения.'));
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
      title: t(
        [
          'Исходная позиция',
          'Средние пальцы',
          'Безымянные пальцы',
          'Мизинцы',
          'Основной ряд',
          'Верхний ряд',
          'Нижний ряд',
          'Связный текст',
        ][i],
      ),
      keys: i === 7 ? '' : g,
      text: i === 7 ? l.text : drill(g),
      focus: t(focuses[[0, 1, 2, 3, 4, 6, 10, 15][i]]),
      section: t(i < 5 ? 'ОСНОВА' : i < 7 ? 'ВСЯ КЛАВИАТУРА' : 'ТЕКСТ'),
    }));
  }
  return titles.map((title, i) => {
    let text;
    if (i === 15) text = l.text;
    else if ([5, 9].includes(i)) text = (l.groups[i] + ' ' + l.groups[i]).trim();
    else if (i === 14)
      text =
        l.capitals ||
        (l === builtinLanguages.ru
          ? 'Аа Оо Фа Жа. Лада дома. Вода в реке, книга на столе. Как дела? Хорошо!'
          : 'Aa Ff Jj Kk. A good day. Jane reads a book, Fred takes a walk. How are you? Fine!');
    else {
      text = drill(l.groups[i], i < 5 ? 20 : 24);
      if (i > 0 && i < 5) text += ' ' + drill(l.groups.slice(0, i + 1).join(''), 8);
    }
    return {
      id: i,
      title: t(l === builtinLanguages.fr && i === 5 ? 'Сочетания основного ряда' : title),
      keys: [5, 9, 15].includes(i) ? '' : l.groups[i].replaceAll(' ', ''),
      text,
      focus: t(focuses[i]),
      section: t(
        i < 6
          ? '01 · ОСНОВНОЙ РЯД'
          : i < 10
            ? '02 · ВЕРХНИЙ РЯД'
            : i < 13
              ? '03 · НИЖНИЙ РЯД'
              : '04 · УВЕРЕННАЯ ПЕЧАТЬ',
      ),
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
    this.errorPositions = {};
    this.missedPositions = new Set();
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
      if (!this.missedPositions.has(this.position)) {
        this.missedPositions.add(this.position);
        this.errorPositions[expected] = (this.errorPositions[expected] || 0) + 1;
      }
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
  presentations() {
    const counts = {};
    for (const char of this.text) counts[char] = (counts[char] || 0) + 1;
    return counts;
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
