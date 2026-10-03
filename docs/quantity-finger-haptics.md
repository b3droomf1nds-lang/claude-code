# Quantity selector: finger-down haptics

Target: unpublished draft `193289027910` on `imraiy-tv.myshopify.com`.

The owner asked to retain the existing near-finished movement and concentrate on vibration while dragging. Knob spring tuning, opening/closing, layout, pencil tap, preview prices, save timing, and Remove stay unchanged. No stylesheet or drawer markup is uploaded by this change.

## Native switch handling

Only real, trusted touch events move the invisible native switch across its midpoint, and only when the finger crosses a quantity boundary. There is no backlog replay while a finger stays at one quantity, no synthetic activation after release, and no promise of feedback at every skipped notch in a single delivered touch event.

For a drag, a nonpassive `touchend` handler prevents the default lift click before native click preactivation. It does not cancel `touchstart` or `touchmove`. The next drag preserves native tracking rather than writing `checked` again. The handler resynchronizes with the browser's 200ms held timer; cancellation, multiple fingers, menu close, page exit, or hiding clear the warm state. Disabling the control and removing `switch` during reset prevents a pending native held callback from starting a new tracking session after cleanup. Taps keep normal native activation.

This is inferred from [WebKit's switch implementation](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp), not a supported haptics API. The first cold swipe can still be silent before native tracking starts. Tapping a quantity or closing resets it. Source-level tracking state is not evidence that the physical phone vibrated, and the timing boundary needs testing on the owner's Safari.

The owner subsequently confirmed that the pencil, slow first drag, and later swipes work, but a quick first swipe is silent. The follow-up [first-swipe priming trial](quantity-first-swipe-prime.md) changes the native-control handoff only and must be confirmed separately on the phone.

Android retains the existing notch pulse queue during contact; lifting or canceling discards queued pulses instead of playing them during the remaining spring settle.

## Verification and rollback

Run `node --check theme-draft/assets/theme-r3.js` and `node --test tests/quantity-haptics.test.mjs`. The 28 tests cover real-event flip requests, warm/cold transitions, no stationary replay, cancellation, release silence, unchanged spring tuning, close timing, reduced motion, saving, and Remove. They do not test an iPhone motor.

The bundled Liquid validator could not start because `@shopify/theme-check-common` is missing. Installed Shopify Theme Check reports the existing 23 errors and 8 warnings; no new offense is introduced by this update. Use the [scoped Shopify theme CLI workflow](https://shopify.dev/docs/api/shopify-cli/theme/theme-push), then pull each pushed path back and compare it.

On 2026-10-03, all three uploaded paths were pulled into `work/quantity-finger-haptics-20261003/verified/` and matched the working tree after normalizing whitespace and line endings. A 390 × 844 Chrome preview confirmed an ordinary drag from 1 to 5, live prices and shipping, closing, quantity 5 after reload, keyboard selection, Remove, no test panel, and no console errors. Only the temporary test item was removed, restoring the original empty cart, and the viewport override was reset. The baseline and edited code also produced 82 exactly matching motion samples across opening, a rapid multi-stop drag with reversal, release, and closing. Screenshot: `work/quantity-finger-haptics-20261003/verified/mobile-selector.jpg`.

Fresh baseline files are in `work/quantity-finger-haptics-20261003/baseline/`. Roll back only this task's changes in `assets/theme-r3.js`, `layout/theme.liquid`, and `locales/en.default.json`, after checking for newer Claude edits. Do not replace an entire file from a backup or force-push. Physical Safari feedback remains unverified until the owner tries an ordinary pencil-open and drag; there are no extra test buttons.
