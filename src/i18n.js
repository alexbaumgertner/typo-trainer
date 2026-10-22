import uk from './locales/uk.js';
import de from './locales/de.js';
import tr from './locales/tr.js';
import fr from './locales/fr.js';
import es from './locales/es.js';

export const catalogs = { uk, de, tr, fr, es };
export const interfaceLanguages = {
  ru: 'Русский',
  uk: 'Українська',
  de: 'Deutsch',
  tr: 'Türkçe',
  fr: 'Français',
  es: 'Español',
};
let locale = 'ru';
export function getLocale() {
  return locale;
}
export function setLocale(value) {
  locale = Object.hasOwn(interfaceLanguages, value) ? value : 'ru';
}
// Russian source messages are stable keys. Only authored UI strings go through t;
// exercise text, names, imported titles and other user data are never translated.
export function t(message) {
  const catalog = catalogs[locale];
  return catalog && Object.hasOwn(catalog, message) ? catalog[message] : message;
}

const staticText = [];
const staticAttributes = [];
let initialized = false;
export function translateDocument() {
  if (!initialized) {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script, style')) continue;
      const source = node.textContent.replace(/\s+/g, ' ').trim();
      if (source && Object.hasOwn(uk, source))
        staticText.push([
          node,
          source,
          node.textContent.match(/^\s*/)[0],
          node.textContent.match(/\s*$/)[0],
        ]);
    }
    for (const element of document.querySelectorAll(
      '[aria-label], [placeholder], meta[name="description"]',
    )) {
      for (const attribute of ['aria-label', 'placeholder', 'content']) {
        if (element.hasAttribute(attribute))
          staticAttributes.push([element, attribute, element.getAttribute(attribute)]);
      }
    }
    initialized = true;
  }
  for (const [node, source, before, after] of staticText) {
    if (node.isConnected) node.textContent = before + t(source) + after;
  }
  for (const [element, attribute, source] of staticAttributes)
    element.setAttribute(attribute, t(source));
  document.documentElement.lang = locale;
}
