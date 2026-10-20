/**
 * Marks HTML templates so the formatter can indent their markup.
 * Interpolated values follow the same rules as ordinary template literals.
 * Escape user-provided text before interpolation, just as in regular templates.
 */
export function html(parts, ...values) {
  return parts.reduce((output, part, index) => {
    const value = index < values.length ? values[index] : '';
    return output + part + value;
  }, '');
}
