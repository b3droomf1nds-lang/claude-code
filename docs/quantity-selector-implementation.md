# Voltical cart quantity selector: implementation handoff

Written 4 October 2026. Describes source revision `550cd39fc7a55481a9e61b16633a54b794536706` on `claude/shopify-cli-setup-5ih4po`.

This is the pencil-operated quantity selector in the cart drawer, not the product-page quantity field or sticky Add-to-bag bar. It explains the existing implementation; creating this document did not change or upload theme code.

## Read this first: what works and what is still a trial

The selector is a custom HTML/CSS/JavaScript control. Its appearance and spring motion are drawn by the theme. Cart changes use Shopify's Ajax Cart API. Vibration is a separate, platform-dependent layer.

- The owner confirmed the pencil vibration, a slow first drag, and subsequent swipes in version `93a5979`. A quick first swipe could still be silent.
- Version `550cd39` adds an isolated native-control priming trial intended to keep the pencil vibration **and** make that first quick swipe vibrate. Its code paths and ordinary cart behavior have been tested, but its physical feedback has **not yet been confirmed on the owner's iPhone**.
- There is no implemented after-release haptic playback tied to the knob's remaining animation. The earlier synthetic-click experiment produced no vibration for the owner and was removed.
- The browser, OS, device settings, and event delivery ultimately decide which requested vibrations are felt. Passing automated tests is not proof of a physical tick at every notch.

Do not tell another developer that the first-fast-swipe Safari problem is conclusively solved. The latest version is a trial, not a supported Safari haptics API.

## 1. Where the implementation lives

All paths below are relative to the repository containing this document.

| File | Responsibility |
| --- | --- |
| [theme-draft/assets/theme-r3.js](../theme-draft/assets/theme-r3.js) | `Drawer` module: renders cart lines, creates the selector, runs springs, previews prices, saves quantity, and handles haptics. |
| [theme-draft/assets/theme-r2.css](../theme-draft/assets/theme-r2.css) | `.cart-line__qty*`, `.qty-menu*`: pencil hit area, frosted pill, dots, fill, knob, and hidden touch surface. |
| [theme-draft/snippets/cart-drawer.liquid](../theme-draft/snippets/cart-drawer.liquid) | Drawer shell and hooks such as `data-drawer-lines`, `data-ship-price`, and `data-drawer-subtotal`. |
| [theme-draft/layout/theme.liquid](../theme-draft/layout/theme.liquid) | Loads `theme-r2.css`, `theme-r3.js`, and the theme's configuration/translations. |
| [tests/quantity-haptics.test.mjs](../tests/quantity-haptics.test.mjs) | Source-based unit tests for selector state, event handling, animation, save timing, and native-control priming. |
| [quantity-finger-haptics.md](quantity-finger-haptics.md) | Earlier finger-down implementation and verification record. |
| [quantity-first-swipe-prime.md](quantity-first-swipe-prime.md) | Latest priming trial, verification record, and rollback details. |

The selector is inside a closure, not an exported library. Its helpers depend on the surrounding drawer's `cart`, `busy`, DOM nodes, `$`/`$$`, `money`, `fetchJSON`, `window.Voltical`, and `window.VolticalStrings`. The snippets below are excerpts from that implementation, not a complete standalone widget.

For an immutable copy, use the [source at the documented revision](https://github.com/b3droomf1nds-lang/claude-code/blob/550cd39fc7a55481a9e61b16633a54b794536706/theme-draft/assets/theme-r3.js). Later Claude/Codex changes may make the working files different.

## 2. The complete interaction

```text
Tap Qty / pencil
  -> measure pencil and drawer
  -> grow the pencil circle into the frosted quantity pill
  -> drag or tap a stop: update selected quantity and local price preview
  -> release: spring to the nearest stop; keep the menu open
  -> tap outside / Enter / Space / Escape
  -> shrink back into the pencil
  -> hide the menu
  -> save the final quantity to Shopify, if changed
  -> replace preview prices with Shopify's returned cart
```

Moving over a notch does not trigger a network request. Releasing the finger does not save or close the menu. Selecting `0` means **Remove**, but the item is only removed when the menu closes and the change is saved.

The normal stops are `0` through `5`. If an existing line already has more than five items, the upper stop expands to include that quantity:

```js
const n = Math.max(5, item.quantity) + 1;
```

`n` includes the Remove stop. This is not an unlimited quantity input or a stock-aware maximum; Shopify remains authoritative when the change is submitted.

## 3. Opening from the pencil without replacing the cart

`render()` builds each line with a stable Shopify line-item key. The ordinary button remains the keyboard/screen-reader entry point. A separate label containing a native switch provides the touch pencil activation:

```html
<button type="button" class="cart-line__qty" data-qty-edit aria-label="Quantity ${i.quantity}, edit">
  <span class="cart-line__qty-label">Qty</span>
  <span class="cart-line__qty-num">${i.quantity}</span>
  <span class="cart-line__pencil">${PENCIL}</span>
</button>
<label class="cart-line__qty-tap" data-qty-edit aria-hidden="true"><input type="checkbox" switch tabindex="-1"></label>
```

This HTML is inside a JavaScript template literal; `${...}` is substituted by `render()`. The switch is not the drawn pencil. Its label is the transparent, enlarged touch target over the quantity button.

```css
.drawer-scroller .cart-line__side{position:relative}
.drawer-scroller .cart-line__qty-tap{position:absolute;z-index:1;top:-6px;left:-8px;right:-8px;height:34px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.drawer-scroller .cart-line__qty-tap input{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
```

The delegated click handler finds the correct line by `data-line-key`. It does not open a second editor or open one during a cart save:

```js
if (e.target.closest('[data-qty-edit]') && !qm && !busy) { tick(); openQtyMenu(item, line); }
```

`tick()` requests the ordinary Vibration API pulse where available. On the native-switch route, the pencil feedback comes from the real label/control activation, not from a scripted `.click()` pretending to be a touch.

`openQtyMenu()` measures the pencil's current screen rectangle. It centers the expanded pill on the drawer, with a viewport-safe vertical position. It stores the line key and starting quantity, creates three spring states, and hides only the pencil SVG using `is-qty-open`; it does not remove the pencil's layout box.

```js
const W = Math.min(QM.W, vw - 56);
const from = { x: pen.left + pen.width / 2, y: pen.top + pen.height / 2 };
const to = { x: card.left + card.width / 2, y: Math.min(vh - QM.H / 2 - 16, Math.max(from.y, 130)) };
const n = Math.max(5, item.quantity) + 1;
qm = {
  key: item.key, start: item.quantity, n, W, from, to,
  p: qmSpring(0), k: qmSpring(item.quantity), s: qmSpring(1),
  shown: -1, drag: null, closing: false, settled: false
};
```

After opening, a zero-delay callback focuses the element with `role="slider"`. The delay lets the label's native activation finish first, without scrolling the page.

## 4. Why the movement feels like a native pop-up

The visible selector is custom, not an HTML range input. It starts as a 27px circle over the pencil and grows into a maximum 334 × 72px pill. JavaScript creates two dot layers, a blue fill, a white knob containing the pencil SVG, a quantity label, frost layers, and an invisible input.

```js
const QM = { W: 334, H: 72, P: 12, T: 48, K: 40, D: 12, FROM: 27 };
```

`P` is padding, `T` is track height, `K` is knob diameter, and `D` is dot diameter. The current source comments describe fitting the visual timing to the owner's iPhone screen recording; this is not Apple's private animation code.

Three independent springs are re-aimed without restarting from a fixed keyframe:

| State | Meaning | Current tuning |
| --- | --- | --- |
| `qm.p` | Opening/closing progress | Open: response `0.338`, damping `0.822`, starting velocity `8.72`. Close: response `0.2`, damping `1`, velocity `-8 * max(0, p.x)`. |
| `qm.k` | Knob position in stop units | Follow finger: `0.09`, `1`. Snap to a stop: `0.26`, `0.86`. |
| `qm.s` | Whole-pill scale | Touch: target `1.02`, `0.2`, `1`. Release: target `1`, `0.32`, `0.55`. |

Response is in seconds; damping below `1` permits overshoot. These are solver parameters, not fixed animation durations.

The exact integrator is:

```js
const qmSpring = (x) => ({
  x, v: 0, to: x, w: 20, z: 1,
  aim(to, response, damping, v) {
    this.to = to; this.w = (2 * Math.PI) / response; this.z = damping;
    if (v != null) this.v = v;
  },
  set(x) { this.x = this.to = x; this.v = 0; },
  step(dt) {
    const n = Math.ceil(dt / 0.004);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.w * this.w * (this.x - this.to) - 2 * this.z * this.w * this.v) * h;
      this.x += this.v * h;
    }
    if (Math.abs(this.x - this.to) < 1e-4 && Math.abs(this.v) < 1e-3) { this.x = this.to; this.v = 0; return false; }
    return true;
  }
});
```

`qmLoop()` uses `requestAnimationFrame`, caps the frame timestep at `1/30` second, and lets the integrator subdivide into at most 4ms steps. It paints while a spring is moving or a drag is active, then stops requesting frames when idle. The quantity animation is a main-thread rAF animation; it must not be confused with the drawer's separate Web Animations API keyframes.

`qmPaint()` derives width, height, center, radius, track/dot/knob geometry, and label opacity from the live spring state. Frost opacity is set on the individual blur layers rather than fading their parent. The stylesheet supplies the 3/7/14px masked frost, an 18px backdrop blur on the pill, blue fill `#2f5bef`, white knob, and soft blue glow.

The haptic hit surface follows the same painted rectangle. In the framed trial, its iframe uses the pill's scaled width/height and viewport position; the ordinary hidden input is made non-interactive while the frame is active.

With `prefers-reduced-motion: reduce`, opening/closing progress is set directly rather than springing. The existing drag/snap behavior is retained; reduced-motion handling is not a claim that every animation in the whole drawer is disabled.

## 5. Finger position, notch changes, and release

`qm.k.to` is the knob's target. `qm.k.x` is the knob's current animated position. `qm.shown` is the integer displayed and previewed. Keeping these separate lets the label/prices respond immediately while the knob follows softly.

The **first** drag after the menu opens takes the knob to the finger, as before: the thumb arrives from the pencil near the pill's far end, where a relative push would have no room, and taking the knob to it gives the first quick swipe a crossing (and so a native flip) on its very first move. Every **later** drag is **relative**: it moves the knob as far as the finger moves, wherever on the pill the finger starts, so lifting the thumb and pushing again from the middle carries the knob the last stop to an end. The first grip starts at the raw stop under the finger (`qmRawAt()`); later grips start at the shown stop. The pointer route and the native touch route share one grip (`qm.grip`, started by whichever gesture start arrives first) so the visible stop and the native switch's stop always agree. Past an end the knob stretches by a small give; pushing beyond `QM_SLACK` (0.3 stops) slides the grip instead of building up, so reversing moves the knob again almost at once:

```js
const QM_SLACK = 0.3;
const qmGrip = (x, other) => {
  if (!other || !qm.grip) qm.grip = { x0: x, k0: qm.grip ? qm.shown : qmRawAt(x) };
};
const qmDragAt = (x) => {
  const g = qm.grip;
  const step = (qm.W - 2 * QM.P - QM.T) / (qm.n - 1);
  const end = qm.n - 1;
  let raw = g.k0 + (x - g.x0) / step;
  if (raw > end + QM_SLACK) { raw = end + QM_SLACK; g.x0 = x - (raw - g.k0) * step; }
  else if (raw < -QM_SLACK) { raw = -QM_SLACK; g.x0 = x - (raw - g.k0) * step; }
  const give = (o) => 0.12 * o / (o + QM_SLACK);
  return raw > end ? end + give(raw - end) : raw < 0 ? -give(-raw) : raw;
};
```

A tap (no drag) still jumps to the stop under the finger, using the absolute mapping `qmStopAt()`.

`qmStop()` rounds and clamps that value to an actual stop. Movement must exceed 4px before being classified as a drag. A pointer is captured on the active input, so leaving its rectangle does not lose the gesture. Unrelated pointer IDs are ignored.

```js
const qmMoveTo = (x) => {
  const d = qm.drag;
  if (!d.moved && Math.abs(x - d.x0) < 4) return;
  d.moved = true;
  qm.k.aim(qmDragAt(x), 0.09, 1);
  qmShow(qmStop(qm.k.to), true, true);
};
```

`qmPointerMove()` processes `getCoalescedEvents()` where available, then the event's final position. This preserves delivered intermediate crossings and reversals instead of considering only one endpoint. Frame-local coordinates are converted to parent viewport coordinates before this mapping.

On `pointerup`, the final position is processed once more for a drag, then the knob springs to the rounded target. A tap chooses the stop beneath the tap. The menu stays open.

This is **not a velocity-based inertial fling** that can travel freely across many extra quantities after release. Remaining movement is the spring catching up and settling to the selected target. There is no rAF-driven vibration loop during that settling.

`qmShow()` changes the label, Remove styling, ARIA value, and cart preview only when the integer changes. For Vibration API devices, a drag jumping from 1 to 5 requests four pulses; native Safari's route has different limits, explained below.

## 6. Immediate cart preview without network lag

`previewQty(key, q)` looks up the cart line by its Shopify **line-item key**, not its DOM position or product ID. It calculates `item.final_price * q`, updates that line's displayed number/price, and passes a derived cart to `paintTotals()`.

It does not mutate the authoritative `cart` object. The complete preview routine is:

```js
const previewQty = (key, q) => {
  const item = cart.items.find((i) => i.key === key);
  const line = qmLine(key);
  if (!item || !line) return;
  const linePrice = item.final_price * q;
  let d = linePrice - item.final_line_price;
  const items = cart.items.map((i) => (i === item ? Object.assign({}, i, { quantity: q, final_line_price: linePrice }) : i));
  const prot = items.find(isProtection);
  if (prot) {
    const tier = tierVariant(cart.items_subtotal_price + d - prot.final_line_price);
    if (tier) {
      d += tier.price - prot.final_line_price;
      items[items.indexOf(prot)] = Object.assign({}, prot, { final_line_price: tier.price });
    }
  }
  $('.cart-line__qty-num', line).textContent = q;
  $('.cart-line__qty', line).setAttribute('aria-label', 'Quantity ' + q + ', edit');
  $('.cart-line__price', line).textContent = money(linePrice);
  paintTotals(Object.assign({}, cart, {
    items,
    items_subtotal_price: cart.items_subtotal_price + d,
    total_price: cart.total_price + d,
    item_count: cart.item_count + q - item.quantity
  }));
};
```

`paintTotals()` also previews shipping and the total. If shipping protection is already selected, the preview includes its applicable price tier. The existing shipping calculator uses currency-specific free-shipping thresholds; unsupported currencies show “Calculated at checkout.” These are local estimates, not fresh checkout quotes.

Quantity-dependent discounts, stock limits, and other server decisions can make the returned cart differ from this simple unit-price preview. The Shopify response replaces the estimate after saving. Shopify documents the line-key/quantity change operation in the [Ajax Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart#post-locale-cart-change-js).

## 7. Closing back into the pencil before saving

The close animation does **not** wait for the network. That ordering is the important part of the lag fix.

`closeQtyMenu()` stops queued pulses, ignores duplicate close requests, clears the active drag, determines the final rounded quantity, and records `commitQty` only if it changed. It re-measures the current pencil once, then re-aims the spring from its current state:

```js
const v = qmStop(qm.k.to);
qm.commitQty = v !== qm.start ? v : null;
const line = qmLine(qm.key);
const pen = line && $('.cart-line__pencil', line).getBoundingClientRect();
if (pen && pen.width) qm.from = { x: pen.left + pen.width / 2, y: pen.top + pen.height / 2 };
qmEl.root.classList.remove('is-settled');
qm.s.aim(1, 0.2, 1);
if (qmReduce.matches) qm.p.set(0);
else qm.p.aim(0, 0.2, 1, -8 * Math.max(0, qm.p.x));
qmRun();
```

The measured pencil still has a rectangle because its SVG was hidden with opacity rather than removing its layout. It is not measured again every frame.

When closing progress reaches `0.01` or less, `qmFinish()` restores the pencil, hides the menu, clears its state, and focuses the drawer without scrolling. **Only then** does it call `applyQty()`.

```js
if (commitQty != null) applyQty(key, commitQty);
```

Saving uses the existing drawer mutation path:

```js
const applyQty = (key, q) => {
  if (busy) { setTimeout(() => applyQty(key, q), 120); return; }
  mutate({ id: key, quantity: q }).then(syncProtectionTier)
    .catch(() => render());
};
```

`mutate()` sets `busy`, POSTs JSON to `/cart/change.js`, replaces `cart` with the returned object, calls `render()`, and clears `busy` in `finally`. A protection-tier change may then need its own remove/add/refresh operations. “Save once” refers to the edited product-line quantity submission, not necessarily only one HTTP request for the entire protection workflow.

Opening another quantity menu is blocked while `busy` is true, avoiding stale-quantity edits during a save. A rejected quantity change re-renders the last known cart. It does not show a custom error message or promise perfect recovery from an ambiguous network failure.

Do not move the Shopify request back into the drag loop or before the menu disappears: cart re-rendering would compete with the animation and could replace the pencil node it is returning to.

## 8. Ordinary Vibration API route

Feature detection chooses the route:

```js
const canVibrate = typeof navigator.vibrate === 'function';
const useSwitchHaptics = !canVibrate && 'switch' in qmEl.hap;
```

Where `navigator.vibrate` exists, the selector requests an 8ms pulse and schedules remaining requested pulses 16ms apart:

```js
const playTick = () => {
  tickTimer = 0;
  if (!ticksPending) return;
  ticksPending--;
  try { navigator.vibrate(8); } catch (e) { ticksPending = 0; }
  tickTimer = setTimeout(playTick, 16);
};
const tick = (count = 1) => {
  if (!canVibrate) return;
  ticksPending += count;
  if (!tickTimer) playTick();
};
const stopTicks = () => {
  clearTimeout(tickTimer);
  tickTimer = 0;
  ticksPending = 0;
};
```

Repeated positions do not add pulses. Drag release, cancellation, menu close, and page suspension discard the pending queue. A tap can still request its single selection pulse. Feature detection and pulse requests do not prove that a particular device actually vibrated.

## 9. Safari route: a real native switch under the finger

On a browser exposing the `switch` input property without `navigator.vibrate`, the visible custom pill is still drawn by the theme. A separate, transparent **real checkbox switch** receives the genuine touch.

The local implementation names its tracking bookkeeping `hapWarm`, but JavaScript cannot directly inspect WebKit's private tracking state. “Warm” is our estimate, not a browser acknowledgement.

### Moving the hidden switch, not drawing fake vibration

During a touch, the invisible input becomes 4000 × 40px. The code places its midpoint 100px to one side of the finger, then alternates sides at eligible quantity changes. The oversized width keeps the finger near the middle, away from the ends.

```js
const HAP = { W: 4000, H: 40, D: 100, RESET: 200, FOLLOW: 205 };
```

Placement is handled by:

```js
const hapPlace = (x, y) => {
  const input = hapControl();
  const origin = hapOrigin(input);
  input.style.cssText = (hapFrame ? hapFrame.base : '') + 'width:' + HAP.W + 'px;height:' + HAP.H + 'px;transform:translate(' +
    (x - origin.left - HAP.W / 2 - qm.hapT.side * HAP.D) + 'px,' + (y - origin.top - HAP.H / 2) + 'px)';
  input.getBoundingClientRect();
};
```

The forced rectangle read applies the new geometry before native default handling. `hapControl()` selects either the ordinary menu input or the primed iframe input; `hapOrigin()` accounts for frame coordinates.

`hapTouchStart()` accepts one trusted touch on the active control. A cold start resets checkedness; a warm start deliberately avoids that write. It records a touch identifier, schedules local 200/205ms bookkeeping deadlines, and places the input.

`hapTouchMove()` checks the actual touch position independently of pointer-event order. Its key gate is:

```js
const v = h.moved ? qmStop(qmDragAt(x)) : h.shown;
const crossed = v !== h.shown;
h.shown = v;
const ready = qm.hapWarm && (!qm.hapReadyAt || qm.hapResetAt > now);
if (crossed && ready) {
  h.side = -h.side;
  h.flips++;
}
qm.hapSide = h.side;
hapPlace(x, y);
```

It requests **at most one native midpoint crossing per delivered real touch event**. Unlike the Vibration API queue, it cannot synthesize a separate trusted event for every intermediate notch skipped in a single event. It never replays missed crossings at a stationary finger.

### Preserving tracking between drags

The touch-start/move listeners are passive. The touch-end listener is deliberately nonpassive so a completed drag can cancel the lift activation:

```js
input.addEventListener('touchstart', hapTouchStart, { passive: true });
input.addEventListener('touchmove', hapTouchMove, { passive: true });
input.addEventListener('touchend', hapEnd, { passive: false });
input.addEventListener('touchcancel', hapEnd, { passive: false });
```

For a trusted, cancelable drag release, `hapEnd()` calls `preventDefault()`, synchronizes the local deadlines, and clears the current touch without deliberately cooling the control. A quantity tap is left to native activation and marks it cold; so does an unexpected native click. A noncancelable end cannot use the preservation route.

`hapSync()` clears the local reset deadline at 200ms and marks the estimate warm at 205ms. A warm subsequent gesture can request crossings immediately before that deadline, with a small resynchronization interval around it. This bookkeeping does not itself create a vibration.

Cancellation, multiple fingers, hiding, or leaving the page reset the session. Reset disables the input, removes its `switch` property, and clears checkedness/deadlines. The ordinary main-document menu input is reset on close. The latest framed trial can instead park its control on an ordinary menu close, as described next.

### Source basis and limits

WebKit's current [CheckboxInputType implementation](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp) gates switch input on trusted events, starts touch-held tracking with a 200ms timer, and starts mouse-down tracking directly. Its touch-end/click paths informed the drag-end cancellation approach. This is source-level evidence, not proof that an installed iOS build behaves identically or that the motor fires.

The owner observed a slow first drag and later swipes working, but a fast cold first drag remained silent. The baseline explanation is that it can finish before tracking becomes usable. See the separate trial below; it should not be presented as a guaranteed browser bypass.

## 10. Latest trial: preserve the pencil tick and prime before the first swipe

The pencil switch and slider switch are separate controls. Warming the same control with the pencil activation would conflict with preserving its normal click behavior. The latest trial instead tries to prime a slider control during an earlier **bag-opening tap**, then keep the real pencil control unchanged.

This section documents what the code attempts. Its Safari physical result is still unverified.

### A. Create isolated controls over existing bag-opening buttons

`hapMountSeeds()` runs only for the native-switch route with a coarse pointer. It creates a same-origin `about:blank` iframe for each existing `[data-cart-open]` or `[data-atc]` button. Each frame gets an ordinary transparent checkbox **after its actual `load` event**, plus the selector's shared pointer/touch handlers.

The frames are not visible UI and do not move or restyle the source buttons. While resting over a button, the input permits normal touch panning with `touch-action:auto`. Scroll/resize events and size/attribute observers queue position updates; a center-point hit test avoids covering a button already obscured by another interface. This is not a guarantee for every possible dynamic overlay; those paths still need testing.

### B. Qualify a genuine stationary tap

The seed's first touch starts as an ordinary checkbox, not a switch. Touch-start/end are not canceled. A candidate is accepted only for a trusted single-finger release, movement no more than 8px, an enabled button, and an endpoint still inside that button. Drags, cancellation, or multiple fingers do not qualify. The candidate expires after 1500ms.

### C. Attempt immediate native tracking on real compatibility mouse-down

A qualifying real mouse-down enables switch behavior before native default handling and positions the midpoint beside the real pointer:

```js
input.addEventListener('mousedown', (e) => {
  if (!e.isTrusted || e.button !== 0 || qm || isOpen || closing || !seed.candidate ||
    performance.now() - seed.candidate.at > 1500 || button.disabled) return;
  input.switch = true;
  input.style.cssText = base + 'width:' + HAP.W + 'px;height:' + HAP.H + 'px;transform:translate(' +
    (e.clientX - HAP.W / 2 + HAP.D) + 'px,' + (e.clientY - HAP.H / 2) + 'px)';
  input.getBoundingClientRect();
  seed.priming = true;
});
```

The code is waiting for the browser's real compatibility events. It does not manufacture trusted `MouseEvent` or `TouchEvent` objects.

### D. Preserve the same input, then run the existing cart action

On the corresponding real mouse-up:

```js
input.addEventListener('mouseup', (e) => {
  if (!e.isTrusted || e.button !== 0 || !seed.priming || qm || isOpen || closing || button.disabled) return;
  seed.priming = false;
  seed.candidate = null;
  input.remove();
  doc.body.appendChild(input);
  input.getBoundingClientRect();
  hapPrime = { seed, warm: true, side: -1, resetAt: 0, readyAt: 0 };
  seed.activatedAt = performance.now();
  hapPark(seed);
  button.click();
  setTimeout(() => { if (!isOpen && hapPrime && hapPrime.seed === seed) { hapClearPrime(); hapQueueSeeds(); } }, 1500);
});
```

The same input is removed and reattached, not replaced. The rationale is that [WebKit EventHandler](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/EventHandler.cpp) clears the pending click node when it is removed, while [InputType's base detach hook](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/InputType.cpp) is empty. Retaining native tracking through this exact sequence is an **inference being tested**, not a verified engine contract.

`button.click()` only forwards the existing ordinary cart action once. It is **not** the proposed haptic source. If a native click still arrives, the code downgrades the warm estimate and guards against duplicate button activation for 600ms. The frame is parked offscreen with pointer events disabled rather than destroyed.

The iframe is intended to isolate this control's native mouse-capture bookkeeping from the later pencil click in the parent document. No new tab, native app, or permission dialog is introduced.

### E. Adopt that input when the pencil opens the selector

`openQtyMenu()` uses a connected, enabled, switch-capable prime without writing its checkedness again:

```js
if (hapPrime && hapPrime.seed.input.isConnected && !hapPrime.seed.input.disabled && hapPrime.seed.input.switch) {
  hapFrame = hapPrime.seed;
  qm.hapWarm = hapPrime.warm || performance.now() >= hapPrime.readyAt && hapPrime.readyAt > 0;
  qm.hapSide = hapPrime.side;
  qm.hapResetAt = hapPrime.resetAt;
  qm.hapReadyAt = hapPrime.readyAt;
  hapSync(performance.now());
}
```

`qmPaint()` moves the frame to the pill's exact painted position. The same shared handlers capture pointers on `event.currentTarget` and convert child-frame `clientX` to parent coordinates. The visible knob, springs, preview, and save timing do not change.

### F. Cleanup, fallback, and known boundaries

- An ordinary menu close without an active native touch can preserve the framed prime via `hapReset(true)` and park it for the next opening.
- A tap on a quantity still cools the active control. The next swipe can therefore be cold again.
- Page hiding/exit, cancellation, and drawer closure clear the priming state. Canceling a framed contact also clears its pointer drag so rAF cannot run forever.
- Keyboard bag opening does not generate a touch prime. Browsers without the capability use the original selector route.
- Native click fallback marks the prime cold instead of claiming it survived. It is not a guarantee that every unusual Safari event sequence preserves warmth or normal page scrolling.

For the full setup/observer/reset implementation, read `hapMountSeeds`, `hapUpdateSeeds`, `hapClearPrime`, `hapReset`, `hapControl`, `hapOrigin`, and `hapClientX` in the pinned `theme-r3.js`. Copying only the two mouse listeners above would omit necessary guards and cleanup.

## 11. Accessibility and interaction boundaries

The visible quantity button remains available to keyboard/screen-reader users. The custom pill has `role="slider"`, `aria-valuemin="0"`, a dynamic `aria-valuemax`, and updated `aria-valuenow`/`aria-valuetext`. Arrow keys select adjacent stops; Enter or Space closes and saves. Escape and an outside pointer-down also close and save—Escape is **not** a revert-to-original command.

The decorative label, native haptic inputs, and prime frames are hidden from the accessibility tree. This preserves a usable keyboard path, but is not a claim that a full VoiceOver/TalkBack audit has been completed.

The quantity menu's full-screen overlay prevents the page/drawer from scrolling while it is open. The cart drawer's own swipe-to-close behavior is a separate system. Do not apply the selector's pointer rules to the drawer or sticky product-page cart without reviewing their own requirements.

## 12. Verification and what the tests cannot prove

Run from the repository root:

```powershell
node --check theme-draft/assets/theme-r3.js
node --test tests/quantity-haptics.test.mjs
git diff --check
```

At the documented implementation revision, the suite contains 38 passing tests. It covers delivered notch counting/coalesced reversals, trusted-event gates, warm/cold bookkeeping, frame coordinates, native-click fallback, cancellation, release queue cleanup, reduced motion, Remove, opening/closing, and save-after-close ordering. The close-motion test checks return to the pencil within 250ms in its simulated conditions.

The harness uses mocked elements/events/timers. It can assert that the code requested a flip or pulse; it cannot turn a mocked event into a trusted browser event, emulate Safari's native default handlers, or prove an iPhone vibration.

The earlier verification record also contains:

- 82 matching baseline/trial motion samples across opening, rapid drag/reversal, release, and closing.
- A local Chromium frame fixture confirming setup, primed-state adoption, alignment, dragging, preview, save, and close. Its feature seams and mouse input do not prove Safari's real compatibility-event path.
- A real 390 × 844 draft preview confirming Add to bag, pencil opening, 1-to-5 dragging, updated price/free shipping, close, quantity 5 after reload, and keyboard Remove, with no captured console errors. The temporary test item was removed and the original empty cart restored.
- The pushed JavaScript was pulled back from the unpublished draft and matched the local file after whitespace/line-ending normalization.

These records concern the previous implementation task; writing this handoff does not constitute another store test or deployment. The bundled Liquid validator was unavailable because `@shopify/theme-check-common` was missing. Installed Theme Check previously reported the unchanged baseline of 23 errors and 8 warnings, not a completely clean theme.

### Physical iPhone acceptance still needed for the latest trial

1. Reload the unpublished draft on the owner's Safari.
2. Open the bag through Your bag, then separately test opening through Add to bag.
3. Tap the pencil and immediately make a fast first swipe. Check the pencil tick and first-swipe ticks separately.
4. Compare a slow drag, repeated drags, a reversal, a quantity tap, and reopening the menu. Check whether a tap cools the next swipe.
5. Start a scrolling gesture on a bag-opening button without intending to tap it. Ensure the hidden seed does not accidentally add/open or interfere with scrolling.
6. Close the menu, wait for the save, reload, and verify the stored quantity. Test Remove, keyboard selection, and page hide/return. Remove only a temporary test line, never the owner's existing items.

If the priming trial fails, report which gesture failed; do not silently call it successful because the visible slider or mocked tests passed.

## 13. Notes for Claude or a future developer

Preserve these invariants unless the owner explicitly asks to change them:

- Leave the pencil's real label/switch activation intact.
- Keep `qm.k.to`, `qm.k.x`, and `qm.shown` separate; do not tie UI selection to the spring's lagging position.
- Do not overwrite a warm input's checkedness at the start of every swipe.
- Do not replace trusted-touch handling with synthetic click replay.
- Keep network/cart re-rendering out of the drag loop and out of the pencil-close animation.
- Use Shopify line-item keys; preserve preview shipping/protection and server reconciliation.
- Preserve the existing spring tuning, 4px drag threshold, nearest-stop release, and final-position processing unless motion is the requested change.
- Preserve native cleanup and iframe coordinate conversion together. Deleting just one part of the priming system can leave invisible hit targets or stuck animation state.
- Avoid altering adjacent cart-drawer/sticky-cart/comparison code during a haptics fix. Read the current files and diff first because Claude may be editing concurrently.

For rollback, the latest trial is commit `550cd39`; its parent `93a5979` is the previous finger-down version. Inspect newer changes and reverse only the trial's patch, not the whole shared asset blindly. [quantity-first-swipe-prime.md](quantity-first-swipe-prime.md) records the local baseline location. The removed after-release experiment in `6739e03` is historical and must not be mistaken for the working implementation.

Any future theme change must follow [AGENTS.md](../AGENTS.md): Shopify CLI, only the unpublished draft `193289027910` on `imraiy-tv.myshopify.com`, fresh pull before editing, scoped `--only` upload with `--nodelete`, and a pull-back comparison afterward. Never target the live theme, commit credentials, overwrite Claude's unrelated work, or force-push the shared Git branch.
