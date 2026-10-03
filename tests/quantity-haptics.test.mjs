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
    this.eventOptions = new Map();
    this.nodes = new Map();
  }
  set innerHTML(value) { this.children = Array.from({ length: (value.match(/<i>/g) || []).length }, () => new Element()); }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback, options) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(callback);
    this.eventOptions.set(name, options);
  }
  emit(type, data = {}) {
    const event = {
      type, isTrusted: true, pointerId: 1, pointerType: 'touch', cancelable: true, defaultPrevented: false,
      preventDefault() { if (this.cancelable) this.defaultPrevented = true; }, ...data
    };
    for (const callback of this.events.get(type) || []) callback(event);
    return event;
  }
  set checked(value) { this._checked = value; this.checkedWrites = (this.checkedWrites || 0) + 1; }
  get checked() { return this._checked || false; }
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

function harness({ native = false, quantity = 1, reduced = false, experiment = false } = {}) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const frames = new Map();
  const pulses = [];
  const changes = [];
  const previews = [];
  const item = { key: 'test-line', quantity, final_price: 100, final_line_price: quantity * 100 };
  const line = new Element();
  const documentEvents = new Element();
  const windowEvents = new Element();
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
      addEventListener: (...args) => documentEvents.addEventListener(...args)
    },
    window: {
      innerHeight: 844, matchMedia: () => ({ matches: reduced }),
      location: { search: experiment ? '?qty_haptics=release-test' : '' },
      addEventListener: (...args) => windowEvents.addEventListener(...args),
      VolticalStrings: { remove: 'Remove' }
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
  vm.runInContext(selector + '\nthis.api = { openQtyMenu, closeQtyMenu, qmEl, state: () => qm };', context);
  const { api } = context;
  api.openQtyMenu(item, line);
  const state = () => api.state();
  const x = (value) => state().to.x - state().W / 2 + 12 + 24 + value * (state().W - 24 - 48) / (state().n - 1);
  const pointer = (type, value, extra = {}) => api.qmEl.hap.emit(type, { clientX: x(value), ...extra });
  const touch = (type, value, extra = {}) => {
    const point = { identifier: 1, clientX: x(value), clientY: state().to.y };
    return api.qmEl.hap.emit(type, {
      changedTouches: [point], touches: ['touchend', 'touchcancel'].includes(type) ? [] : [point], ...extra
    });
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
  return { api, state, x, pointer, touch, advance, frame, settle, frames, context, line, pulses, changes, previews, documentEvents, windowEvents };
}

test('one fast input crossing four notches delivers four distinct pulses while held', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 5);
  h.advance(100);
  h.pointer('pointerup', 5);
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

test('releasing beyond the last delivered move selects the target without delayed pulses', () => {
  const h = harness();
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 2);
  h.pointer('pointerup', 5);
  h.advance(100);
  assert.equal(h.state().k.to, 5);
  assert.equal(h.pulses.length, 1);
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
  assert.equal(h.pulses.length, 1);
});

test('native crossings before tracking starts are not replayed at a stationary finger', () => {
  const h = harness({ native: true, quantity: 12 });
  h.pointer('pointerdown', 12);
  h.touch('touchstart', 12);
  h.pointer('pointermove', 0);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.flips, 0);
  h.advance(206);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.flips, 0);
  h.advance(8);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.flips, 0);
  assert.equal(h.state().hapT.owed, undefined);
  h.pointer('pointermove', 1);
  h.touch('touchmove', 1);
  assert.equal(h.state().hapT.flips, 1);
});

test('native touch counting does not depend on pointermove being delivered first', () => {
  const h = harness({ native: true });
  h.touch('touchstart', 1);
  h.advance(206);
  h.touch('touchmove', 5);
  assert.equal(h.state().hapT.flips, 1);
  h.pointer('pointerdown', 1);
  h.pointer('pointermove', 5);
  h.touch('touchmove', 5);
  assert.equal(h.state().hapT.flips, 1);
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

function warmDrag(h, from = 1, to = 2) {
  h.pointer('pointerdown', from);
  h.touch('touchstart', from);
  h.advance(206);
  h.pointer('pointermove', to);
  h.touch('touchmove', to);
  h.pointer('pointerup', to);
  return h.touch('touchend', to);
}

test('a real drag suppresses the lift click before native default handling', () => {
  const h = harness({ native: true });
  const end = warmDrag(h);
  assert.equal(end.defaultPrevented, true);
  assert.equal(h.api.qmEl.hap.eventOptions.get('touchend').passive, false);
  assert.equal(h.state().hapWarm, true);
  assert.equal(h.state().hapT, null);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
});

test('a warm second drag requests a native flip immediately without resetting checkedness', () => {
  const h = harness({ native: true });
  warmDrag(h);
  const writes = h.api.qmEl.hap.checkedWrites;
  h.advance(20);
  h.pointer('pointerdown', 2);
  h.touch('touchstart', 2);
  assert.equal(h.api.qmEl.hap.checkedWrites, writes);
  assert.equal(h.state().hapT.side, 1);
  h.advance(10);
  h.pointer('pointermove', 3);
  h.touch('touchmove', 3);
  assert.equal(h.state().hapT.flips, 1);
  assert.equal(h.state().hapT.side, -1);
  h.touch('touchmove', 3.1);
  assert.equal(h.state().hapT.flips, 1);
  h.pointer('pointermove', 2);
  h.touch('touchmove', 2);
  assert.equal(h.state().hapT.flips, 2);
});

test('a short first drag can finish warming during a pause without playing release clicks', () => {
  const h = harness({ native: true });
  h.pointer('pointerdown', 1);
  h.touch('touchstart', 1);
  h.advance(80);
  h.pointer('pointermove', 2);
  h.touch('touchmove', 2);
  h.pointer('pointerup', 2);
  assert.equal(h.touch('touchend', 2).defaultPrevented, true);
  assert.equal(h.state().hapWarm, false);
  const writes = h.api.qmEl.hap.checkedWrites;
  h.advance(150);
  h.pointer('pointerdown', 2);
  h.touch('touchstart', 2);
  assert.equal(h.state().hapWarm, true);
  assert.equal(h.api.qmEl.hap.checkedWrites, writes);
  h.pointer('pointermove', 3);
  h.touch('touchmove', 3);
  assert.equal(h.state().hapT.flips, 1);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
});

test('a warm gesture resynchronizes at WebKit held tracking restart without an extra requested flip', () => {
  const h = harness({ native: true });
  warmDrag(h);
  h.pointer('pointerdown', 2);
  h.touch('touchstart', 2);
  h.advance(190);
  h.pointer('pointermove', 3);
  h.touch('touchmove', 3);
  assert.equal(h.state().hapT.flips, 1);
  h.advance(10);
  h.touch('touchmove', 3);
  assert.equal(h.state().hapT.side, -1);
  assert.equal(h.state().hapT.flips, 1);
  h.advance(6);
  h.touch('touchmove', 3);
  assert.equal(h.state().hapT.flips, 1);
  h.pointer('pointermove', 4);
  h.touch('touchmove', 4);
  assert.equal(h.state().hapT.flips, 2);
});

test('native tracking requests only one flip per delivered touch event, with no delayed replay', () => {
  const h = harness({ native: true, quantity: 20 });
  h.pointer('pointerdown', 20);
  h.touch('touchstart', 20);
  h.advance(206);
  h.pointer('pointermove', 0);
  h.touch('touchmove', 0);
  assert.equal(h.state().hapT.flips, 1);
  for (let i = 0; i < 10; i++) h.touch('touchmove', 0);
  assert.equal(h.state().hapT.flips, 1);
});

test('a native tap is left to the real switch and makes the next swipe cold', () => {
  const h = harness({ native: true });
  warmDrag(h);
  h.pointer('pointerdown', 2);
  h.touch('touchstart', 2);
  h.pointer('pointerup', 4);
  const end = h.touch('touchend', 4);
  assert.equal(end.defaultPrevented, false);
  assert.equal(h.state().shown, 4);
  assert.equal(h.state().hapWarm, false);
  h.touch('touchstart', 4);
  h.touch('touchmove', 3);
  assert.equal(h.state().hapT.flips, 0);
});

test('a noncancelable drag ending falls back to cold tracking', () => {
  const h = harness({ native: true });
  h.pointer('pointerdown', 1);
  h.touch('touchstart', 1);
  h.advance(206);
  h.pointer('pointermove', 2);
  h.touch('touchmove', 2);
  h.pointer('pointerup', 2);
  const end = h.touch('touchend', 2, { cancelable: false });
  assert.equal(end.defaultPrevented, false);
  assert.equal(h.state().hapWarm, false);
  assert.equal(h.state().hapReadyAt, 0);
});

test('native cancellation clears tracking, blocks the pending held timer, and allows a new touch', () => {
  const h = harness({ native: true });
  warmDrag(h);
  h.pointer('pointerdown', 2);
  h.touch('touchstart', 2);
  h.touch('touchmove', 3);
  h.pointer('pointercancel', 3);
  h.touch('touchcancel', 3);
  assert.equal(h.state().hapT, null);
  assert.equal(h.state().hapWarm, false);
  assert.equal(h.api.qmEl.hap.switch, false);
  assert.equal(h.api.qmEl.hap.disabled, false);
  h.pointer('pointerdown', 3);
  h.touch('touchstart', 3);
  assert.equal(h.api.qmEl.hap.switch, true);
  h.touch('touchmove', 4);
  assert.equal(h.state().hapT.flips, 0);
});

test('untrusted or unrelated touch events do not produce native flip requests', () => {
  const h = harness({ native: true });
  h.touch('touchstart', 1, { isTrusted: false });
  assert.equal(h.state().hapT, null);
  h.touch('touchstart', 1);
  h.advance(206);
  h.touch('touchmove', 2, { isTrusted: false });
  h.touch('touchmove', 2, { changedTouches: [{ identifier: 2, clientX: h.x(2), clientY: h.state().to.y }] });
  assert.equal(h.state().hapT.flips, 0);
  h.touch('touchmove', 2);
  assert.equal(h.state().hapT.flips, 1);
});

test('multiple fingers safely cancel the native tracking session', () => {
  const h = harness({ native: true });
  warmDrag(h);
  h.touch('touchstart', 2, { touches: [{ identifier: 1 }, { identifier: 2 }] });
  assert.equal(h.state().hapWarm, false);
  assert.equal(h.state().hapT, null);
  assert.equal(h.api.qmEl.hap.switch, false);
});

test('closing and reopening clears native warm state without changing the save', () => {
  const h = harness({ native: true });
  warmDrag(h);
  h.api.closeQtyMenu();
  assert.equal(h.api.qmEl.hap.switch, false);
  assert.equal(h.api.qmEl.hap.disabled, true);
  h.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.changes)), [{ id: 'test-line', quantity: 2 }]);
  h.api.openQtyMenu({ key: 'test-line', quantity: 2 }, h.line);
  assert.equal(h.state().hapWarm, false);
  assert.equal(h.api.qmEl.hap.switch, true);
  assert.equal(h.api.qmEl.hap.disabled, false);
});

test('visibility loss and page exit clear native capture without changing quantity', () => {
  for (const action of ['hidden', 'pagehide']) {
    const h = harness({ native: true });
    warmDrag(h);
    if (action === 'hidden') {
      h.context.document.hidden = true;
      h.documentEvents.emit('visibilitychange');
    } else h.windowEvents.emit('pagehide');
    assert.equal(h.state().hapWarm, false);
    assert.equal(h.state().hapT, null);
    assert.equal(h.state().drag, null);
    assert.equal(h.api.qmEl.hap.switch, false);
    assert.equal(h.state().shown, 2);
  }
});

test('lifting or canceling stops queued Android pulses but retains the existing spring', () => {
  for (const end of ['pointerup', 'pointercancel']) {
    const h = harness();
    h.settle();
    h.pointer('pointerdown', 1);
    h.pointer('pointermove', 5);
    assert.equal(h.state().k.x, 1);
    assert.equal(h.state().k.to, 5);
    assert.equal(h.state().k.w, 2 * Math.PI / 0.09);
    h.frame();
    const velocity = h.state().k.v;
    h.pointer(end, 5);
    assert.equal(h.state().k.v, velocity);
    assert.equal(h.state().k.to, 5);
    assert.equal(h.state().k.w, 2 * Math.PI / 0.26);
    assert.equal(h.state().k.z, 0.86);
    const pulses = h.pulses.length;
    h.settle();
    h.advance(500);
    assert.equal(h.pulses.length, pulses);
    assert.equal(h.state().k.x, 5);
  }
});

test('the retired experiment cannot create a panel or synthetic release clicks on its old URL', () => {
  const h = harness({ native: true, experiment: true });
  h.settle();
  warmDrag(h, 1, 5);
  h.settle();
  h.advance(500);
  assert.equal(h.api.qmEl.root.dataset.hapticTest, undefined);
  assert.equal(h.api.qmEl.hap.clicks || 0, 0);
  assert.equal(h.pulses.length, 0, 'native position requests are not evidence of physical motor feedback');
  assert.ok(!source.includes('qmReleaseTest'));
});
