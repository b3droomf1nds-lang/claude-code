import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../theme-draft/assets/theme-r3.js', import.meta.url), 'utf8');
const trialSource = source.slice(source.indexOf('  const cartToolbarTrial ='), source.indexOf('  /* ---------- util ---------- */'));

class Style {
  values = new Map();
  getPropertyValue(key) { return this.values.get(key)?.value || ''; }
  getPropertyPriority(key) { return this.values.get(key)?.priority || ''; }
  setProperty(key, value, priority = '') { this.values.set(key, { value, priority }); }
  removeProperty(key) { this.values.delete(key); }
}

class Events {
  handlers = new Map();
  addEventListener(name, callback, options) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push({ callback, capture: !!options?.capture });
  }
  emit(name, props = {}) {
    const event = { target: this, touches: [], stopped: false,
      stopImmediatePropagation() { this.stopped = true; }, ...props };
    for (const handler of [...(this.handlers.get(name) || [])].sort((a, b) => Number(b.capture) - Number(a.capture))) {
      handler.callback(event);
      if (event.stopped) break;
    }
    return event;
  }
}

function setup(options = {}) {
  const window = new Events();
  const viewport = new Events();
  const media = new Events();
  media.matches = options.mobile !== false;
  const root = { style: new Style(), scrollHeight: 8000, clientHeight: 720 };
  const body = { style: new Style() };
  const frames = new Map();
  const timers = new Map();
  let id = 0;
  let now = 1000;
  let backgroundEvents = 0;
  let fits = 0;
  let canFit = true;
  let pinned = !!options.pinned;
  const padding = () => parseFloat(body.style.getPropertyValue('padding-top') || '24');
  const basePadding = options.padding ? parseFloat(options.padding) : 24;
  const main = { getBoundingClientRect: () => ({ top: 70 + padding() - window.scrollY +
    (options.badGeometry && padding() !== basePadding ? 2 : 0) }) };
  const header = { getBoundingClientRect: () => ({ top: Math.max(0, padding() - window.scrollY) }) };
  const document = { documentElement: root, body,
    getElementById: name => name === 'main' ? main : null,
    querySelector: name => name === '.atc.is-pinned' ? (pinned ? {} : null) : name === '.site-header' ? header : null };
  if (options.padding) body.style.setProperty('padding-top', options.padding, 'important');
  if (options.overflow) body.style.setProperty('overflow', options.overflow, 'important');
  if (options.transition) body.style.setProperty('transition', options.transition, 'important');
  root.style.setProperty('scroll-behavior', 'smooth', 'important');
  root.style.setProperty('overflow-anchor', 'auto');
  Object.assign(window, {
    location: { search: options.search ?? '?carttoolbar=1' },
    Shopify: { designMode: !!options.designMode },
    visualViewport: viewport, innerHeight: 720,
    scrollX: 0, scrollY: options.y ?? 500,
    matchMedia: () => media,
    scrollTo({ left, top }) {
      this.scrollX = left;
      this.scrollY = options.rejectScroll ? this.scrollY : top;
      this.emit('scroll', { target: document });
    }
  });
  Object.assign(viewport, { height: 720, scale: options.scale ?? 1 });
  const context = vm.createContext({ window, document, URLSearchParams,
    performance: { now: () => now },
    getComputedStyle: element => element === body
      ? { paddingTop: padding() + 'px', overflowY: body.style.getPropertyValue('overflow') || 'auto' } : {},
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    setTimeout: callback => { timers.set(++id, callback); return id; },
    clearTimeout: key => timers.delete(key) });
  vm.runInContext(trialSource + '\nglobalThis.trial = cartToolbarTrial;', context);
  window.addEventListener('scroll', () => backgroundEvents++);
  return { window, viewport, root, body, document, media, main,
    trial: context.trial,
    open: () => context.trial.open(() => fits++, () => canFit),
    get backgroundEvents() { return backgroundEvents; }, get fits() { return fits; },
    get pendingTimers() { return timers.size; }, get pendingFrames() { return frames.size; },
    setCanFit: value => { canFit = value; }, setPinned: value => { pinned = value; },
    advance: value => { now += value; },
    frame() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
    lock() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); }
  };
}

test('the normal draft and theme editor never install the experiment', () => {
  for (const options of [{ search: '' }, { search: '?carttoolbar=0' }, { designMode: true }]) {
    const env = setup(options);
    assert.equal(env.open(), false);
    assert.equal(env.trial.close(), false);
    assert.equal(env.window.__voltCartToolbarTrial, undefined);
    assert.equal(env.window.handlers.size, 1);
    assert.equal(env.body.style.values.size, 0);
  }
});

test('desktop is unchanged even with the test flag', () => {
  const env = setup({ mobile: false });
  assert.equal(env.open(), false);
  assert.equal(env.window.scrollY, 500);
  assert.equal(env.body.style.values.size, 0);
});

test('a nudge preserves the background and restores the original offset and styles', () => {
  for (const y of [0, 500, 4000]) {
    const env = setup({ y, padding: '31px', transition: 'padding-top 2s' });
    const top = env.main.getBoundingClientRect().top;
    assert.equal(env.open(), true);
    assert.equal(env.window.scrollY, y + 96);
    assert.equal(env.main.getBoundingClientRect().top, top);
    assert.equal(env.body.style.getPropertyValue('transition'), 'none');
    assert.equal(env.backgroundEvents, 0);
    assert.equal(env.body.style.getPropertyValue('overflow'), '');
    env.lock();
    env.frame();
    assert.equal(env.body.style.getPropertyValue('overflow'), 'hidden');
    assert.equal(env.trial.close(), true);
    assert.equal(env.window.scrollY, y);
    assert.equal(env.main.getBoundingClientRect().top, top);
    assert.equal(env.body.style.getPropertyValue('padding-top'), '31px');
    assert.equal(env.body.style.getPropertyPriority('padding-top'), 'important');
    assert.equal(env.body.style.getPropertyValue('overflow'), '');
    assert.equal(env.root.style.getPropertyValue('scroll-behavior'), 'smooth');
    assert.equal(env.body.style.getPropertyValue('transition'), 'padding-top 2s');
    assert.equal(env.body.style.getPropertyPriority('transition'), 'important');
    assert.equal(env.root.style.getPropertyPriority('scroll-behavior'), 'important');
    assert.equal(env.root.style.getPropertyValue('overflow-anchor'), 'auto');
    assert.equal(env.pendingTimers, 0);
    env.frame(); env.frame();
    env.window.emit('scroll', { target: env.document });
    assert.equal(env.backgroundEvents, 1);
  }
});

test('closing before the delayed lock cancels the timer and a later viewport fit', () => {
  const env = setup();
  env.open();
  env.viewport.emit('resize');
  assert.equal(env.pendingFrames, 1);
  env.trial.close();
  env.lock(); env.frame(); env.frame();
  assert.equal(env.fits, 0);
  assert.equal(env.body.style.getPropertyValue('overflow'), '');
  assert.equal(env.window.scrollY, 500);
});

test('a repeat open does not stack padding or nudge the page twice', () => {
  const env = setup();
  env.open(); env.open();
  assert.equal(env.window.scrollY, 596);
  assert.equal(env.body.style.getPropertyValue('padding-top'), '120px');
  env.trial.close(); env.open();
  assert.equal(env.window.scrollY, 596);
  env.trial.close();
  assert.equal(env.window.scrollY, 500);
  assert.equal(env.body.style.getPropertyValue('padding-top'), '');
});

test('a blocked scroll or a detected background shift rolls back synchronously', () => {
  for (const options of [{ rejectScroll: true }, { badGeometry: true }]) {
    const env = setup(options);
    const top = env.main.getBoundingClientRect().top;
    assert.equal(env.open(), false);
    assert.equal(env.window.scrollY, 500);
    assert.equal(env.main.getBoundingClientRect().top, top);
    assert.equal(env.body.style.getPropertyValue('padding-top'), '');
    assert.equal(env.pendingTimers, 0);
    assert.equal(env.window.__voltCartToolbarTrial.active, false);
    assert.equal(env.window.__voltCartToolbarTrial.events.at(-1).type, 'rolled-back');
  }
});

test('active scrolling, a finger down, a pinned sticky bar, zoom, and rubber-banding skip the experiment', () => {
  for (const options of [{ pinned: true }, { scale: 1.2 }, { y: -20 }, { y: 7400 }, { overflow: 'hidden' }]) {
    const env = setup(options);
    assert.equal(env.open(), false);
    assert.equal(env.window.scrollY, options.y ?? 500);
  }
  const env = setup();
  env.window.emit('scroll', { target: env.document });
  assert.equal(env.open(), false);
  env.advance(160);
  env.window.emit('touchstart', { touches: [{}] });
  assert.equal(env.open(), false);
  env.window.emit('touchend');
  assert.equal(env.open(), true);
});

test('inner cart scrolling is not swallowed and real input immediately resumes after close', () => {
  const env = setup();
  env.open();
  assert.equal(env.window.emit('scroll', { target: {} }).stopped, false);
  assert.equal(env.backgroundEvents, 1);
  env.trial.close();
  env.window.emit('touchstart', { touches: [{}] });
  assert.equal(env.window.emit('scroll', { target: env.document }).stopped, false);
  assert.equal(env.backgroundEvents, 2);
});

test('viewport changes re-anchor the drawer but not during a drawer drag', () => {
  const env = setup();
  env.open();
  env.viewport.height = 800;
  env.viewport.emit('resize'); env.frame();
  assert.equal(env.fits, 1);
  env.setCanFit(false);
  env.viewport.emit('resize'); env.frame();
  assert.equal(env.fits, 1);
  env.setCanFit(true);
  env.window.emit('touchend'); env.frame();
  assert.equal(env.fits, 2);
  env.trial.close();
  env.viewport.emit('resize'); env.frame(); env.frame();
  assert.equal(env.fits, 2);
});

test('page exit and crossing to desktop both restore the background', () => {
  for (const exit of ['pagehide', 'desktop']) {
    const env = setup();
    env.open();
    if (exit === 'pagehide') env.window.emit('pagehide');
    else { env.media.matches = false; env.media.emit('change'); }
    assert.equal(env.window.scrollY, 500);
    assert.equal(env.body.style.getPropertyValue('padding-top'), '');
    assert.equal(env.window.__voltCartToolbarTrial.active, false);
    env.lock();
    assert.equal(env.body.style.getPropertyValue('overflow'), 'hidden');
  }
});
