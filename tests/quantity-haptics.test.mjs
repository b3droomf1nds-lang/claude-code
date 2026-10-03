import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../theme-draft/assets/theme-r3.js', import.meta.url), 'utf8');
const selector = source.slice(source.indexOf('    const QM ='), source.indexOf('    if (protectToggle) protectToggle.addEventListener'));

class Element {
  constructor() {
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.events = new Map();
    this.nodes = new Map();
  }
  set innerHTML(value) { this.children = Array.from({ length: (value.match(/<i>/g) || []).length }, () => new Element()); }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(callback);
  }
  emit(type, data = {}) {
    const event = { type, isTrusted: true, pointerId: 1, pointerType: 'touch', preventDefault() {}, ...data };
    for (const callback of this.events.get(type) || []) callback(event);
  }
  querySelector(name) {
    if (!this.nodes.has(name)) this.nodes.set(name, new Element());
    return this.nodes.get(name);
  }
  querySelectorAll(name) {
    return name.includes('frost') ? [new Element(), new Element(), new Element()] : [new Element(), new Element()];
  }
  getBoundingClientRect() {
    this.measurements = (this.measurements || 0) + 1;
    return { left: 0, top: 200, width: 390, height: 20 };
  }
  setPointerCapture() {}
  appendChild(node) { this.children.push(node); }
  click() { this.clicks = (this.clicks || 0) + 1; this.emit('click', { isTrusted: false }); }
  contains(node) { return node === this || this.children.includes(node) || [...this.nodes.values()].some((child) => child.contains(node)); }
  focus() {}
}

function harness({ native = false, quantity = 1, reduced = false, experiment = false, themeId = 193289027910, themeRole = 'unpublished' } = {}) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const frames = new Map();
  const pulses = [];
  const changes = [];
  const previews = [];
  const item = { key: 'test-line', quantity, final_price: 100, final_line_price: quantity * 100 };
  const line = new Element();
  line.dataset = { lineKey: item.key };
  const context = {
    PENCIL: '<svg></svg>',
    navigator: native ? {} : { vibrate: (duration) => { pulses.push({ at: now, duration }); return true; } },
    document: {
      documentElement: { clientWidth: 390 },
      body: { appendChild() {} },
      createElement: () => {
        const root = new Element();
        if (native) root.querySelector('.qty-menu__hap').switch = true;
        return root;
      },
      addEventListener() {}
    },
    window: {
      innerHeight: 844, matchMedia: () => ({ matches: reduced }),
      location: { search: experiment ? '?qty_haptics=release-test' : '' },
      Shopify: { theme: { id: themeId, role: themeRole } },
      addEventListener() {},
      VolticalStrings: {
        remove: 'Remove',
        hapticTest: { title: 'Experiment', instructions: 'Test only', route: 'Route', direct: 'Direct switch', label: 'Via label', probe: 'Test after release' }
      }
    },
    URLSearchParams,
    performance: { now: () => now },
    setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, at: now + delay }); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: (callback) => { frames.set(++nextTimer, callback); return nextTimer; },
    $: (name, root) => root.querySelector(name),
    $$: (name, root) => root.querySelectorAll(name),
    el: new Element(), linesEl: { children: [line] },
    cart: { items: [item], items_subtotal_price: quantity * 100, total_price: quantity * 100, item_count: quantity },
    money: String, isProtection: () => false,
    paintTotals: (cart) => previews.push(cart.item_count),
    mutate: (change) => {
      assert.equal(context.api.qmEl.root.hidden, true, 'cart refresh must not interrupt the close');
      changes.push(change);
      return Promise.resolve();
    },
    syncProtectionTier() {}, render() {}, busy: false, qtyOpenKey: null
  };
  vm.createContext(context);
  vm.runInContext(selector + '\nthis.api = { openQtyMenu, closeQtyMenu, qmEl, qmReleaseTest, state: () => qm };', context);
  const { api } = context;
  api.openQtyMenu(item, line);
  const state = () => api.state();
  const x = (value) => state().to.x - state().W / 2 + 12 + 24 + value * (state().W - 24 - 48) / (state().n - 1);
  const pointer = (type, value, extra = {}) => api.qmEl.hap.emit(type, { clientX: x(value), ...extra });
  const touch = (type, value) => {
    const point = { identifier: 1, clientX: x(value), clientY: state().to.y };
    api.qmEl.hap.emit(type, { changedTouches: [point], touches: type === 'touchend' ? [] : [point] });
  };
  const advance = (amount) => {
    const end = now + amount;
    for (;;) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = end;
  };
  const frame = (amount = 1000 / 60) => {
    advance(amount);
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  };
  const settle = () => {
    for (let i = 0; frames.size && i < 180; i++) frame();
    assert.equal(frames.size, 0, 'animation must finish');
  };
  return { api, state, x, pointer, touch, advance, frame, settle, frames, context, line, pulses, changes, previews };
}

test('one fast input crossing four notches delivers four distinct pulses', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 5);
  h.pointer('pointerup', 5);
  h.advance(100);
  assert.equal(h.state().shown, 5);
  assert.equal(h.pulses.length, 4);
  assert.deepEqual(h.pulses.map((p) => p.at), [0, 16, 32, 48]);
});

test('coalesced samples preserve crossings and reversals inside one event', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 2, { getCoalescedEvents: () => [4, 1, 2].map((v) => ({ clientX: h.x(v) })) });
  h.advance(200);
  assert.equal(h.state().shown, 2);
  assert.equal(h.pulses.length, 7);
});

test('releasing beyond the last delivered move counts the remaining notches', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 2);
  h.pointer('pointerup', 5);
  h.advance(100);
  assert.equal(h.state().k.to, 5);
  assert.equal(h.pulses.length, 4);
});

test('a tap emits one pulse and repeated positions emit none', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointerup', 5);
  h.advance(100);
  assert.equal(h.pulses.length, 1);
  h.pointer('pointerdown', 5);
  h.pointer('pointermove', 5);
  h.pointer('pointerup', 5);
  h.advance(100);
  assert.equal(h.pulses.length, 1);
});

test('close cancels queued pulses and saves only the final quantity', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 5);
  h.api.closeQtyMenu();
  assert.equal(h.changes.length, 0);
  h.settle();
  h.advance(200);
  assert.equal(h.pulses.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 5 }]);
});

test('pointer cancel retains the current quantity and unrelated pointers are ignored', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 5, { pointerId: 2 });
  assert.equal(h.state().shown, 1);
  h.pointer('pointermove', 3);
  h.pointer('pointercancel', 0);
  h.advance(100);
  assert.equal(h.state().shown, 3);
  assert.equal(h.state().k.to, 3);
  assert.equal(h.pulses.length, 2);
});

test('native switch counts more than six crossings without double-counting touch and pointer events', () => {
  const h = harness({ native: true, quantity: 12 });
  h.pointer('pointerdown', 12);
  h.touch('touchstart', 12);
  h.pointer('pointermove', 0);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.owed, 12);
  h.advance(206);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.owed, 11);
  h.advance(8);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.owed, 10);
  assert.equal(h.state().hapT.flips, 2);
});

test('native touch counting does not depend on pointermove being delivered first', () => {
  const h = harness({ native: true });
  h.touch('touchstart', 1);
  h.advance(206);
  h.touch('touchmove', 5);
  assert.equal(h.state().hapT.owed, 3);
  assert.equal(h.state().hapT.flips, 1);
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 5);
  assert.equal(h.state().hapT.owed, 3);
});

test('keyboard selection and Remove retain the existing quantity behavior', () => {
  const h = harness();
  h.api.qmEl.pill.emit('keydown', { key: 'ArrowLeft' });
  assert.equal(h.state().shown, 0);
  assert.equal(h.api.qmEl.pill.attrs['aria-valuetext'], 'Remove');
  h.api.qmEl.pill.emit('keydown', { key: 'Enter' });
  h.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 0 }]);
});

test('close returns monotonically to the pencil within 250ms without measuring every frame', () => {
  const h = harness();
  h.settle();
  const pencil = h.line.querySelector('.cart-line__pencil');
  const before = pencil.measurements;
  h.api.closeQtyMenu();
  assert.equal(pencil.measurements, before + 1);
  let previous = h.state().p.x;
  let count = 0;
  while (h.state() && count < 30) {
    h.frame();
    count++;
    if (h.state()) {
      assert.ok(h.state().p.x <= previous);
      assert.ok(h.state().p.x >= 0);
      previous = h.state().p.x;
    }
  }
  assert.equal(h.state(), null);
  assert.ok(count * 1000 / 60 <= 250, `close took ${count} frames`);
  assert.equal(pencil.measurements, before + 1);
  assert.equal(h.changes.length, 0, 'unchanged quantity must not be saved');
});

test('changed quantity saves exactly once after closing, even if close is requested twice', () => {
  const h = harness();
  h.settle();
  h.pointer('pointerdown', 1);
  h.pointer('pointerup', 5);
  h.settle();
  h.api.closeQtyMenu();
  h.api.closeQtyMenu();
  h.frame();
  assert.ok(h.state().closing);
  assert.equal(h.changes.length, 0);
  h.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 5 }]);
});

test('closing midway through opening does not overshoot or leave the menu visible', () => {
  const h = harness();
  h.frame();
  assert.ok(h.state().p.x > 0 && h.state().p.x < 1);
  h.api.closeQtyMenu();
  h.settle();
  assert.equal(h.api.qmEl.root.hidden, true);
  assert.equal(h.state(), null);
});

test('reduced motion closes on the next frame and saves the selected quantity', () => {
  const h = harness({ reduced: true });
  h.pointer('pointerdown', 1);
  h.pointer('pointerup', 3);
  h.api.closeQtyMenu();
  h.frame();
  assert.equal(h.state(), null);
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 3 }]);
});

test('the selector cannot reopen with a stale quantity during a cart save', () => {
  const h = harness();
  h.api.closeQtyMenu();
  h.settle();
  h.context.busy = true;
  h.api.openQtyMenu({ key: 'test-line', quantity: 1 }, h.line);
  assert.equal(h.state(), null);
});

test('the release experiment is absent on normal URLs, other themes, and live themes', () => {
  for (const options of [{}, { experiment: true, themeId: 192813334854 }, { experiment: true, themeRole: 'main' }]) {
    const h = harness({ native: true, ...options });
    assert.equal(h.api.qmReleaseTest, null);
    assert.equal(h.api.qmEl.root.dataset.hapticTest, undefined);
    h.pointer('pointerdown', 1);
    h.pointer('pointermove', 5);
    h.pointer('pointerup', 5);
    h.settle();
    assert.equal(h.api.qmEl.hap.clicks || 0, 0);
  }
});

test('the probe requests activations at 0, 150, 300 and 450ms without claiming physical haptics', () => {
  const h = harness({ native: true, experiment: true });
  h.api.qmReleaseTest.probe.emit('click');
  assert.equal(h.api.qmEl.hap.clicks, 1);
  h.advance(149);
  assert.equal(h.api.qmEl.hap.clicks, 1);
  h.advance(301);
  assert.equal(h.api.qmEl.hap.clicks, 4);
  const log = JSON.parse(h.api.qmEl.root.dataset.hapticAttemptLog);
  assert.deepEqual(log.map((entry) => entry.at), [0, 150, 300, 450]);
  assert.ok(log.every((entry) => entry.phase === 'probe' && entry.route === 'click'));
  assert.equal(h.pulses.length, 0, 'native switch activation requests are not evidence of physical vibration');
  assert.equal(h.state().shown, 1);
});

test('the label probe uses its associated switch without changing quantity', () => {
  const h = harness({ native: true, experiment: true });
  const probe = h.api.qmReleaseTest;
  assert.equal(probe.label.htmlFor, h.api.qmEl.hap.id);
  probe.mode.value = 'label';
  probe.mode.emit('change');
  probe.probe.emit('click');
  h.advance(450);
  assert.equal(probe.label.clicks, 4);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
  assert.equal(h.api.qmEl.root.dataset.hapticRoute, 'label');
  assert.equal(h.state().shown, 1);
});

test('a fast release attempts each remaining animated notch, not the already selected target', () => {
  const h = harness({ native: true, experiment: true });
  h.settle();
  h.pointer('pointerdown', 1);
  h.touch('touchstart', 1);
  h.pointer('pointermove', 5);
  h.touch('touchmove', 5);
  assert.equal(h.state().shown, 5);
  assert.equal(h.state().k.x, 1);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
  h.pointer('pointerup', 5);
  h.touch('touchend', 5);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
  h.settle();
  h.advance(100);
  const log = JSON.parse(h.api.qmEl.root.dataset.hapticAttemptLog);
  assert.deepEqual(log.map(({ from, to }) => [from, to]), [[1, 2], [2, 3], [3, 4], [4, 5]]);
  assert.ok(log.every((entry) => entry.phase === 'settle'));
  assert.equal(h.api.qmEl.hap.clicks, 4);
  assert.equal(h.state().shown, 5);
  h.api.closeQtyMenu();
  h.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 5 }]);
});

test('release experiment tracks crossings back toward lower quantities', () => {
  const h = harness({ native: true, experiment: true, quantity: 5 });
  h.settle();
  h.pointer('pointerdown', 5);
  h.pointer('pointermove', 1);
  h.pointer('pointerup', 1);
  h.settle();
  h.advance(100);
  const log = JSON.parse(h.api.qmEl.root.dataset.hapticAttemptLog);
  assert.deepEqual(log.map(({ from, to }) => [from, to]), [[5, 4], [4, 3], [3, 2], [2, 1]]);
  assert.equal(h.state().shown, 1);
});

test('a new touch cancels the probe and old released-knob requests', () => {
  const h = harness({ native: true, experiment: true });
  h.api.qmReleaseTest.probe.emit('click');
  h.pointer('pointerdown', 1);
  h.advance(500);
  assert.equal(h.api.qmEl.hap.clicks, 1);
  h.pointer('pointermove', 5);
  h.pointer('pointerup', 5);
  h.frame();
  h.pointer('pointerdown', 5);
  const count = h.api.qmEl.hap.clicks;
  for (let i = 0; i < 30; i++) h.frame();
  assert.equal(h.api.qmEl.hap.clicks, count);
  h.pointer('pointercancel', 5);
  h.settle();
  h.advance(100);
  assert.equal(h.api.qmEl.hap.clicks, count);
});

test('close, visibility loss, and mode changes cancel pending requests', () => {
  for (const action of ['close', 'hidden', 'mode']) {
    const h = harness({ native: true, experiment: true });
    h.api.qmReleaseTest.probe.emit('click');
    if (action === 'close') h.api.closeQtyMenu();
    else if (action === 'hidden') h.context.document.hidden = true;
    else {
      h.api.qmReleaseTest.mode.value = 'label';
      h.api.qmReleaseTest.mode.emit('change');
    }
    h.advance(500);
    assert.equal(h.api.qmEl.hap.clicks, 1);
    assert.equal(h.api.qmReleaseTest.label.clicks || 0, 0);
  }
});

test('programmatic probe clicks, taps, and pointer cancellations do not arm settling requests', () => {
  const h = harness({ native: true, experiment: true });
  h.api.qmReleaseTest.probe.emit('click', { isTrusted: false });
  h.pointer('pointerdown', 1);
  h.pointer('pointerup', 5);
  h.settle();
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
  h.pointer('pointerdown', 5);
  h.pointer('pointermove', 1);
  h.pointer('pointercancel', 1);
  h.settle();
  h.advance(500);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
});

test('multi-notch frames queue distinct requests without a six-crossing cap', () => {
  const h = harness({ native: true, experiment: true, quantity: 20 });
  h.settle();
  h.pointer('pointerdown', 20);
  h.pointer('pointermove', 0);
  h.pointer('pointerup', 0);
  h.settle();
  h.advance(1000);
  const log = JSON.parse(h.api.qmEl.root.dataset.hapticAttemptLog);
  assert.equal(log.length, 20);
  assert.equal(h.api.qmEl.hap.clicks, 20);
  log.slice(1).forEach((entry, i) => assert.ok(entry.at - log[i].at >= 16 - 1e-6));
  assert.deepEqual(log.map((entry) => entry.to), Array.from({ length: 20 }, (_, i) => 19 - i));
});
