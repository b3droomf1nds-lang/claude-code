import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../theme-draft/assets/theme-r3.js', import.meta.url), 'utf8');
const closeStart = source.indexOf('    const finishClose = () => {');
const closeSource = source.slice(closeStart, source.indexOf('    const atRest =', closeStart));
const openStart = source.indexOf('    const open = () => {', closeStart);
const openSource = source.slice(openStart, source.indexOf('    const cardY =', openStart));

test('old test links cannot enable the retired root-scroll experiment', () => {
  assert.doesNotMatch(source, /cartToolbarTrial|carttoolbar|__voltCartToolbarTrial/);
  assert.doesNotMatch(closeSource + openSource, /window\.scrollTo|padding-top|overflow-anchor|stopImmediatePropagation/);
});

test('drawer open and close keep document position and background styles untouched', () => {
  assert.ok(closeStart >= 0 && openStart > closeStart);
  for (const y of [0, 500, 4000]) {
    const bodyStyle = { overflow: '', paddingTop: '24px', transition: 'padding-top 2s' };
    const rootStyle = { scrollBehavior: 'smooth', overflowAnchor: 'auto' };
    const classes = new Set();
    const scrim = { hidden: true, style: { opacity: '' } };
    const scroller = { hidden: true, scrollTop: 0, scrollTo: ({ top }) => { scroller.scrollTop = top; } };
    let focused = 0;
    let primes = 0;
    const context = vm.createContext({
      document: { body: { style: bodyStyle }, documentElement: { style: rootStyle } },
      window: { scrollY: y, scrollTo: () => assert.fail('drawer must not scroll the document') },
      el: { style: { transform: '' },
        classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
        focus: options => { assert.equal(options.preventScroll, true); focused++; } },
      scrim, scroller, maxTop: () => 600, paint: () => {}, stopAnims: () => {},
      hapClearPrime: () => {}, hapQueueSeeds: () => { primes++; }, reduceMotion: { matches: true }
    });
    vm.runInContext('let isOpen = false; let closing = false;\n' + closeSource + openSource +
      '\nglobalThis.drawer = { open, close: finishClose, get isOpen() { return isOpen; } };', context);
    for (let repeat = 0; repeat < 3; repeat++) {
      context.drawer.open();
      assert.equal(context.drawer.isOpen, true);
      assert.equal(bodyStyle.overflow, 'hidden');
      assert.equal(scroller.scrollTop, 600);
      assert.equal(scroller.hidden, false);
      assert.equal(classes.has('is-open'), true);
      context.drawer.close();
      assert.equal(context.drawer.isOpen, false);
      assert.equal(bodyStyle.overflow, '');
      assert.equal(scroller.hidden, true);
      assert.equal(scrim.hidden, true);
      assert.equal(classes.has('is-open'), false);
      assert.equal(context.window.scrollY, y);
      assert.equal(bodyStyle.paddingTop, '24px');
      assert.equal(bodyStyle.transition, 'padding-top 2s');
      assert.equal(rootStyle.scrollBehavior, 'smooth');
      assert.equal(rootStyle.overflowAnchor, 'auto');
    }
    assert.equal(focused, 3);
    assert.equal(primes, 6);
  }
});
