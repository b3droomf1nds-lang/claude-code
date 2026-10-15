---
name: haptics-check
description: >-
  Check that the bag's iPhone vibration still works: the pencil tick, and a
  tick for every quantity on the slider, including a fast FIRST swipe. Run it
  after any change near the cart: the bag/Add to bag buttons, the header, the
  cart sheet (drawer, its glass edge, outside taps), the quantity pencil or
  slider, or anything that adds main-thread work while the cart is open. Also
  run it when the owner says the vibration feels off. If anything fails, use
  the haptics-fix skill.
---

# Haptics check

The vibration is not a supported Safari API. It is a chain of native-control
tricks in `theme-draft/assets/theme-r3.js`, and any link can break silently.
No test here can feel a Taptic tick. This check verifies every condition the
ticks depend on, then hands the physical test to the owner.

## How the ticks work (read this first)

- **Android:** `navigator.vibrate(8)` per quantity crossed. On iPhone,
  `canVibrate` is false and everything below applies (`useSwitchHaptics`).
- **Pencil tick:** a real `<input type=checkbox switch>` inside
  `label.cart-line__qty-tap`, over "Qty 1 ✎". The finger's own tap flips it,
  and iOS ticks. A switch flipped from script is silent (iOS 26.5+).
- **Slider ticks:** a 4000 × 40px invisible switch sits under the finger. On
  every quantity crossed, `hapTouchMove` moves it so the finger lands on the
  other side (`side * HAP.D`), and WebKit's own switch tracking flips it, with
  a tick. That needs one delivered `touchmove` per crossing, handled on time.
- **Warm first swipe (the fragile part):** a cold switch only starts tracking
  after WebKit's 200ms touch-hold timer, so a fast first swipe would be silent.
  To avoid that, invisible same-origin iframes (`iframe.qty-haptic-prime`, z
  119) sit over every `[data-cart-open]` and `[data-atc]` button. The real tap
  on the bag goes into that iframe's input. A stationary touch followed by a
  trusted compatibility `mousedown` turns its switch on and starts native
  tracking, then `mouseup` re-parents the input and calls `button.click()`.
  This is `hapPrime`, warm. When the pencil opens the slider, that same iframe
  moves over the pill (z 121) and becomes `hapFrame`, so the first swipe is
  already tracked.
- **Known fragile spots:**
  - **The seed's `-webkit-tap-highlight-color`.** A fully transparent value
    broke the pencil tick (1effa9e, reverted in c8098d8). The owner chose a
    1% grey (583c192) to hide the grey tap box. That is a suspected cause of a
    silent first swipe, but it is the owner's call, so do not change it unless
    asked.
  - **Anything covering the bag button.** `hapUpdateSeeds` only places a seed
    when `elementFromPoint` at the button's centre is the button.
  - **Main-thread work while the slider is up.** Long frames coalesce
    `touchmove`s, so crossings are missed. The cart sheet's glass edge
    (`.drawer-lens`) must not copy or repaint while `qm` is set.
- **Last owner-confirmed state:** commit `c8098d8` (2026-10-09, "Fixed it"),
  then `583c192`'s 1% highlight by the owner's choice.

## Steps

1. **Unit tests:**
   `node --test tests/quantity-haptics.test.mjs tests/cart-toolbar-rollback.test.mjs`
   All must pass.
2. **Runtime check on the working tree:** `node scripts/haptics-check.mjs`.
   All must pass. It drives real CDP touches in Chromium dressed as the iPhone
   route (no `navigator.vibrate`, inputs that take `switch`, coarse pointer),
   with the cart mocked so the real cart is never touched. It checks:
   - the seeds are mounted, sit exactly over the visible bag button, and are
     topmost there;
   - the highlight value;
   - a tap on the bag opens the card through the seed and leaves it primed;
   - the glass edge is ready within 400ms;
   - the pencil opens the slider with the primed seed moved over it, topmost;
   - a fast first swipe of 8 moves goes 1 → 5, reaches the seed each time, and
     asks for one flip per stop crossed;
   - the glass edge copies nothing while the slider is up, even when the page
     changes, and catches up after it closes;
   - the seed returns over the bag after closing;
   - there are no script errors.
   Also run `node scripts/haptics-check.mjs --throttle 4` for phone-like timing.
3. **What's deployed:** after a theme push, run
   `node scripts/haptics-check.mjs --deployed`.
4. **Code drift since the confirmed state:**
   `git diff c8098d8 -- theme-draft/assets/theme-r3.js` and read every hunk
   that touches any of these:
   - `hap*`, `seed`, `qty-haptic-prime`, `switch`, `qmPointer*`, `qmMoveTo`,
     `qmDragAt`, `touchstart` / `touchmove` / `touchend`, `mousedown` /
     `mouseup`, `button.click()`, `elementFromPoint`, `z-index` 119/121;
   - the document-level touch and click guards in the drawer;
   - anything that runs per frame or on mutation while the cart is open.
   Also `git diff c8098d8 -- theme-draft/assets/theme-r2.css` for anything that
   could cover the header bag button or `.qty-menu`, or that changes `z-index`
   or `pointer-events` there.
5. **Compare against known good** when something looks off:
   `git show c8098d8:theme-draft/assets/theme-r3.js > <scratch>/good.js && node scripts/haptics-check.mjs --js <scratch>/good.js`.
   The `INFO` touch-delay line is only meaningful next to such a run, because
   headless Chromium paints the slider's blurs in software.

## Report

Say plainly which checks passed and which failed. Do not claim the phone
vibrates; the browser cannot feel it. If anything failed, or the drift review
found a suspect, go to the **haptics-fix** skill. Otherwise ask the owner to
check on the phone:

1. Reload the draft.
2. Tap the bag.
3. Tap the pencil, then swipe fast at once.

They should feel the pencil tick and one tick per number. Also try "Add to
bag", which has its own seed.

## Keeping this check honest

If a fix adds a new rule, for example "X must not happen while the slider is
up", add a check for it to `scripts/haptics-check.mjs`. Then confirm the check
fails on the broken version with `--js`.
