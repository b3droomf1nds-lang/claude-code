// Runtime check of the bag's iPhone vibration route (quantity slider and pencil),
// in Chromium dressed up as the iPhone path: no navigator.vibrate, inputs that take
// `switch`, touch input. It can't feel a Taptic tick; it checks every condition the
// ticks depend on. See .claude/skills/haptics-check/SKILL.md.
//
//   node scripts/haptics-check.mjs            the working tree's theme-r3.js / theme-r2.css
//   node scripts/haptics-check.mjs --deployed what's on the draft theme now
//   add --throttle 4 to run on a CPU four times slower (phone-like timing)
//   add --js <file> to test another copy of theme-r3.js (e.g. one from an older commit)
//   add --lines 2 for two products in the bag: it then opens small, the pencil in its scrolling list
//
// The cart is mocked (one Core in the bag): nothing is added to or changed in the real cart.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const deployed = args.includes('--deployed');
const throttle = Number(args[args.indexOf('--throttle') + 1]) || (args.includes('--throttle') ? 4 : 1);
const ROOT = new URL('..', import.meta.url).pathname;
const jsFile = args.includes('--js') ? args[args.indexOf('--js') + 1] : ROOT + 'theme-draft/assets/theme-r3.js';   // test another copy of theme-r3.js
const lines = Number(args[args.indexOf('--lines') + 1]) || 1;   // products in the bag; the slider is tried on the first
const URL_ = 'https://imraiy-tv.myshopify.com/products/voltical-core-5k-10k?preview_theme_id=193289027910';
const results = [];
const info = (name, detail) => console.log('INFO ' + name + '  (' + detail + ')');
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); };
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const sameRect = (a, b, tol = 1) => a && b && near(a.left, b.left, tol) && near(a.top, b.top, tol) && near(a.width, b.width, tol) && near(a.height, b.height, tol);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
// the iPhone route: no Vibration API, and <input switch>
await ctx.addInitScript(() => {
  try { Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true }); } catch (e) {}
  if (!('switch' in HTMLInputElement.prototype)) Object.defineProperty(HTMLInputElement.prototype, 'switch', {
    configurable: true, get() { return this.hasAttribute('switch'); }, set(v) { this.toggleAttribute('switch', !!v); } });
});

let product = null, cart = null;
const line = (q, n = 0) => {
  const v = product.variants[n % product.variants.length];
  return { key: v.id + ':check' + (n || ''), id: v.id, variant_id: v.id, quantity: q, product_title: product.title, variant_title: v.title, title: product.title,
    final_line_price: v.price * q, final_price: v.price, original_line_price: v.price * q, price: v.price, line_price: v.price * q,
    image: product.featured_image, url: '/products/' + product.handle, handle: product.handle, properties: {}, product_id: product.id };
};
// q: the first line's quantity (the one the slider changes); any other lines keep one each
const cartOf = (q) => {
  const items = q ? [line(q)] : [];
  for (let n = 1; n < lines; n++) items.push(line(1, n));
  const total = items.reduce((s, i) => s + i.final_line_price, 0);
  return { items, item_count: items.reduce((s, i) => s + i.quantity, 0), total_price: total, items_subtotal_price: total, original_total_price: total, currency: 'GBP', requires_shipping: true };
};
await ctx.route('**/*', async (route) => {
  const req = route.request(), u = req.url();
  if (/\/cart(\/[a-z]+)?\.js(\?|$)/.test(u) && cart) {
    if (/\/cart\/(change|update)\.js/.test(u)) {
      let q = (cart.items.find((i) => /:check$/.test(i.key)) || { quantity: 0 }).quantity;
      try { const b = JSON.parse(req.postData() || '{}'); q = b.quantity ?? (b.updates ? Object.values(b.updates)[0] : q); } catch (e) {}
      cart = cartOf(Number(q) || 0);
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(cart) });
  }
  if (!deployed && /\/assets\/theme-r3\.js/.test(u)) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(jsFile) });
  if (!deployed && /\/assets\/theme-r2\.css/.test(u)) return route.fulfill({ contentType: 'text/css', body: readFileSync(ROOT + 'theme-draft/assets/theme-r2.css') });
  try { await route.fulfill({ response: await route.fetch({ timeout: 30000 }) }); } catch (e) { await route.abort().catch(() => {}); }
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL_, { waitUntil: 'load', timeout: 90000 });
product = await page.evaluate(() => fetch('/products/voltical-core-5k-10k.js').then((r) => r.json()));
cart = cartOf(1);
await page.evaluate(() => document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #PBarNextFrameWrapper, #preview-bar-iframe').forEach((e) => e.remove()));
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(60); await touch('touchEnd', x, y); };
const frames = () => page.evaluate(() => Array.from(document.querySelectorAll('iframe.qty-haptic-prime'), (f) => {
  const r = f.getBoundingClientRect(), d = f.contentDocument, i = d && d.querySelector('input');
  return { left: r.left, top: r.top, width: r.width, height: r.height, pe: f.style.pointerEvents, z: f.style.zIndex,
    sw: !!(i && i.switch), conn: !!(i && i.isConnected), hl: d ? d.documentElement.style.webkitTapHighlightColor : null };
}));

// 1. the route is on
const route = await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, vib: typeof navigator.vibrate, sw: 'switch' in document.createElement('input'),
  hap: !!document.querySelector('.qty-menu__hap'), pencilSwitch: !!document.querySelector('.cart-line__qty-tap input[switch]') || null }));
check('iPhone route is active (coarse pointer, no vibrate, switch inputs)', route.coarse && route.vib !== 'function' && route.sw, JSON.stringify(route));

// 2. seeds over the bag buttons
const bag = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('[data-cart-open]')).find((n) => { const r = n.getBoundingClientRect(); return r.width && r.height && r.top >= 0 && r.top < innerHeight; });
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
});
let seeds = await frames();
check('a vibration seed is mounted for each bag-opening button', seeds.length >= 1 && seeds.length === await page.evaluate(() => document.querySelectorAll('[data-cart-open], [data-atc]').length), seeds.length + ' seeds');
const bagSeed = seeds.find((s) => sameRect(s, bag, 0.5));
check('a seed sits exactly over the visible bag button and takes touches', !!bagSeed && bagSeed.pe !== 'none' && bagSeed.z === '119', JSON.stringify({ bag, seeds }));
const onTop = await page.evaluate((b) => { const n = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return n && n.className; }, bag);
check('nothing covers the seed at the bag\'s centre', onTop === 'qty-haptic-prime', 'topmost: ' + onTop);
// iOS's tap flash on the seed: its own 40% strength (fainter silenced the ticks twice), in the
// colour behind the bag so no box shows
const behind = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('[data-cart-open]')).find((n) => { const r = n.getBoundingClientRect(); return r.width && r.height && r.top >= 0 && r.top < innerHeight; });
  const layers = [];                           // its see-through backgrounds, down to the first solid one
  for (let n = b; n && n.nodeType === 1; n = n.parentElement) {
    const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(getComputedStyle(n).backgroundColor);
    const a = m ? (m[4] === undefined ? 1 : +m[4]) : 0;
    if (!a) continue;
    layers.push([+m[1], +m[2], +m[3], a]);
    if (a >= 1) break;
  }
  let c = [255, 255, 255];
  for (let i = layers.length - 1; i >= 0; i--) { const [r, g, bl, a] = layers[i]; c = [r * a + c[0] * (1 - a), g * a + c[1] * (1 - a), bl * a + c[2] * (1 - a)]; }
  return c.map(Math.round).join(', ');
});
check('seed tap flash keeps iOS\'s 40% strength, in the colour behind the bag (see SKILL.md)', !!bagSeed && bagSeed.hl === 'rgba(' + behind + ', 0.4)',
  String(bagSeed && bagSeed.hl) + ' (behind the bag: rgb(' + behind + '))');

// 3. a real tap on the bag primes the seed and opens the card
await page.evaluate(() => {
  const T = window.__hc = { t0: performance.now(), copies: [], live: null };
  // every copy of the page the glass edge puts in, and when
  document.querySelectorAll('.drawer-lens__view').forEach((v) => v.shadowRoot && new MutationObserver((ms) => ms.forEach((m) =>
    m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('drawer-lens__page')) T.copies.push(performance.now() - T.t0); })))
    .observe(v.shadowRoot, { childList: true, subtree: true }));
  const poll = () => { const b = document.querySelector('.drawer-lens'); if (b && b.classList.contains('is-live')) T.live = performance.now() - T.t0; else requestAnimationFrame(poll); };
  requestAnimationFrame(poll);
});
if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await tap(bag.left + bag.width / 2, bag.top + bag.height / 2);
const opened = await page.waitForFunction(() => document.querySelector('.drawer-scroller .drawer.is-open'), null, { timeout: 5000 }).then(() => true, () => false);
check('tapping the bag opens the card (through the seed)', opened);
seeds = await frames();
const primed = seeds.find((s) => s.sw && s.conn);
check('the seed is primed (its switch stays on, connected) after the tap', !!primed, JSON.stringify(seeds.map((s) => ({ sw: s.sw, conn: s.conn }))));
await page.waitForFunction(() => window.__hc.live !== null, null, { timeout: 500 * throttle }).catch(() => {});
const live = await page.evaluate(() => window.__hc.live);
check('the glass edge is in place within 400ms of the tap (x --throttle), not after the card settles', live !== null && live < 400 * throttle, live === null ? 'not live' : Math.round(live) + 'ms');

// 4. the pencil opens the slider on the primed seed
await page.waitForFunction(() => document.querySelector('.cart-line__qty-tap'), null, { timeout: 5000 }).catch(() => {});
// the card settles (its rise ends), then a quick reach for the pencil
await page.evaluate(() => Promise.all(document.querySelector('.drawer-scroller .drawer').getAnimations().map((a) => a.finished.catch(() => {}))));
// and the cart line is drawn and still (same place for 5 frames)
const pen = await page.evaluate(() => new Promise((done) => {
  let last = '', same = 0, n = 0;
  const look = () => {
    const t = document.querySelector('.drawer-scroller .cart-line__qty-tap'), r = t && t.getBoundingClientRect();
    const key = r && r.width ? [r.left, r.top, r.width].map(Math.round).join() : '';
    same = key && key === last ? same + 1 : 0; last = key;
    if (same >= 5 || ++n > 300) done(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
    else requestAnimationFrame(look);
  };
  look();
}));
await page.waitForTimeout(80);
await tap(pen.x, pen.y);
const menu = await page.waitForFunction(() => { const m = document.querySelector('.qty-menu'); return m && !m.hidden; }, null, { timeout: 3000 }).then(() => true, () => false);
check('tapping the pencil opens the quantity slider', menu);
await page.waitForFunction(() => document.querySelector('.qty-menu.is-settled'), null, { timeout: 3000 }).catch(() => {});
const pill = await page.evaluate(() => { const r = document.querySelector('.qty-menu__pill').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
seeds = await frames();
const over = seeds.find((s) => s.pe !== 'none' && s.z === '121');
check('the primed seed has moved over the slider (warm first swipe)', !!over && near(over.left, pill.left, 2) && near(over.width, pill.width, 3), JSON.stringify({ pill, over }));
const atPill = await page.evaluate((p) => { const n = document.elementFromPoint(p.left + p.width * 0.8, p.top + p.height / 2); return n && n.className; }, pill);
check('touches on the slider land on the seed', atPill === 'qty-haptic-prime', 'topmost: ' + atPill);

// 5. a fast first swipe: every stop crossed asks the switch for a flip, on time
await page.evaluate(() => {
  const f = Array.from(document.querySelectorAll('iframe.qty-haptic-prime')).find((n) => n.style.zIndex === '121');
  const input = f.contentDocument.querySelector('input'), T = window.__hc;
  T.moves = 0; T.flips = 0; T.lag = []; T.side = null; T.labels = [];
  input.addEventListener('touchmove', (e) => {             // runs after the theme's own listener
    T.moves++; T.lag.push(Math.round(f.contentWindow.performance.now() - e.timeStamp));
    const m = /translate\((-?[\d.]+)px/.exec(input.style.transform), t = e.changedTouches[0];
    if (!m) return;
    const side = Math.sign(t.clientX - (parseFloat(m[1]) + 2000));
    if (T.side !== null && side !== T.side) T.flips++;
    T.side = side;
  }, { passive: true });
  T.slider = performance.now() - T.t0;
  // the page changes while the slider is up: the glass edge must wait to repaint until it closes
  document.getElementById('main').firstElementChild.classList.add('haptics-check-poke');
});
const label0 = await page.evaluate(() => document.querySelector('.qty-menu__label').textContent.trim());
const x0 = pill.left + pill.height / 2 + 4, x1 = pill.left + pill.width - 8, y = pill.top + pill.height / 2, steps = 8;
await touch('touchStart', x0, y);
for (let i = 1; i <= steps; i++) { await page.waitForTimeout(12); await touch('touchMove', x0 + (x1 - x0) * i / steps, y); }
await page.waitForTimeout(20);
await touch('touchEnd', x1, y);
await page.waitForTimeout(900);
const sw = await page.evaluate(() => ({ ...window.__hc, label: document.querySelector('.qty-menu__label').textContent.trim() }));
const crossed = Number((sw.label.match(/\d+/) || [0])[0]) - Number((label0.match(/\d+/) || [0])[0]);
check('the swipe moves the quantity to the end', crossed >= 4, label0 + ' -> ' + sw.label);
check('every touch of the swipe reached the seed', sw.moves >= steps, sw.moves + ' of ' + steps);
check('a flip was asked for every stop crossed (primed = warm on the first swipe)', sw.flips >= crossed && crossed > 0, sw.flips + ' flips for ' + crossed + ' stops');
// headless Chromium paints the slider's blurs in software, so its frames run long even on the
// owner-confirmed version: this is for comparing runs, not a pass/fail
info('touch handling delay during the swipe (compare with a known-good run, not an iPhone figure)', 'worst ' + Math.max(0, ...sw.lag) + 'ms');
const busy = sw.copies.filter((t) => t >= sw.slider);
check('the glass edge copies nothing while the slider is up, even when the page changes', !busy.length, busy.length + ' copies');

// 6. close everything: the seed goes back over the bag
const closedAt = await page.evaluate(() => performance.now() - window.__hc.t0);
await tap(195, 120);
await page.waitForTimeout(1300);
const after = (await page.evaluate(() => window.__hc.copies)).filter((t) => t >= closedAt);
check('once the slider closes, the glass edge catches up with the change', after.length > 0, after.length + ' copies');
await page.evaluate(() => document.getElementById('main').firstElementChild.classList.remove('haptics-check-poke'));
await page.evaluate(() => document.querySelector('.drawer__close, [data-drawer-close]').click());
await page.waitForTimeout(1200);
seeds = await frames();
check('after closing, a seed is back over the bag button', seeds.some((s) => sameRect(s, bag, 0.5) && s.pe !== 'none'), JSON.stringify(seeds));
check('no script errors', !errors.length, errors.join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed' + (deployed ? ' (deployed draft)' : ' (working tree)') + (throttle > 1 ? ', CPU x' + throttle : ''));
process.exit(failed.length ? 1 : 0);
