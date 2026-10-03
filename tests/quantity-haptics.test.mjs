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
    const event = { type, pointerId: 1, pointerType: 'touch', preventDefault() {}, ...data };
    for (const callback of this.events.get(type) || []) callback(event);
  }
  querySelector(name) {
    if (!this.nodes.has(name)) this.nodes.set(name, new Element());
    return this.nodes.get(name);
  }
  querySelectorAll(name) {
    return name.includes('frost') ? [new Element(), new Element(), new Element()] : [new Element(), new Element()];
  }
  getBoundingClientRect() { return { left: 0, top: 200, width: 390, height: 20 }; }
  setPointerCapture() {}
  contains(node) { return node === this; }
  focus() {}
}

function harness({ native = false, quantity = 1 } = {}) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
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
    window: { innerHeight: 844, matchMedia: () => ({ matches: false }), VolticalStrings: { remove: 'Remove' } },
    performance: { now: () => now },
    setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, at: now + delay }); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: () => 1,
    $: (name, root) => root.querySelector(name),
    $$: (name, root) => root.querySelectorAll(name),
    el: new Element(), linesEl: { children: [line] },
    cart: { items: [item], items_subtotal_price: quantity * 100, total_price: quantity * 100, item_count: quantity },
    money: String, isProtection: () => false,
    paintTotals: (cart) => previews.push(cart.item_count),
    mutate: (change) => { changes.push(change); return Promise.resolve(); },
    syncProtectionTier() {}, render() {}, busy: false, qtyOpenKey: null
  };
  vm.createContext(context);
  vm.runInContext(selector + '\nthis.api = { openQtyMenu, closeQtyMenu, qmEl, state: () => qm };', context);
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
  return { api, state, x, pointer, touch, advance, pulses, changes, previews };
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
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 0 }]);
});
