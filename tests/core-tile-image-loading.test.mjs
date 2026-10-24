import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../theme-draft/snippets/pdp-compare-inline.liquid', import.meta.url), 'utf8');
const images = [...source.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);

test('Core tile images are discoverable immediately, without scroll-triggered lazy loading', () => {
  assert.equal(images.length, 8);
  for (const image of images) {
    assert.match(image, /\ssrc="[^"]+"/);
    assert.doesNotMatch(image, /\s(?:loading="lazy"|data-src=)/);
  }
});

test('both Core feature icons explicitly load eagerly', () => {
  const icons = images.filter(tag => /class="pdp-cmp__feature-icon"/.test(tag));
  assert.equal(icons.length, 2);
  for (const icon of icons) assert.match(icon, /\sloading="eager"/);
});
