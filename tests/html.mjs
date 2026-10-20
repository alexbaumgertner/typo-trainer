import assert from 'node:assert/strict';
import { html } from '../src/ui/html.js';

const text = 'Александр';
const count = 0;
assert.equal(html`<span>${text}</span>`, `<span>${text}</span>`);
assert.equal(html`<b>${count}</b>`, `<b>${count}</b>`);
assert.equal(html`${null}/${undefined}/${false}`, `${null}/${undefined}/${false}`);
// prettier-ignore
assert.equal(html`<p>line\nnext</p>`, `<p>line\nnext</p>`);
console.log('PASS: HTML templates preserve interpolation and escaped characters.');
