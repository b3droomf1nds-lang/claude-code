# Quantity: draft-only first-swipe priming trial

Target: unpublished theme `193289027910`, store `imraiy-tv.myshopify.com`.

The owner confirmed that the pencil tick, slow first drag, and subsequent swipes work in the previous version. The first quick swipe remains silent. This trial keeps the pencil's native switch and all motion tuning, prices, save timing, styling, and drawer layout. Only `assets/theme-r3.js` is uploaded.

## Route being tried

On a native-switch browser with a coarse pointer, invisible same-origin frames sit over the existing bag-opening buttons (Your bag and Add to bag). Keyboard activation and browsers without this capability keep the original route. The source buttons are not moved or restyled; observers only reposition the transparent hit areas.

The seed starts as an ordinary checkbox with vertical panning allowed. Its touch-start and release are not canceled. Only a real, stationary touch qualifies the later real compatibility mouse-down for warming; drags, cancellation, multiple fingers, disabled buttons, and untrusted input do not qualify. The switch is enabled in that mouse-down listener, before native default handling. Native mouse-down starts switch tracking immediately, unlike the 200ms native touch-held timer.

On mouse-up, the same input is detached and reattached within its own document to invalidate the browser's pending click node, then the existing source button is clicked once for its ordinary cart action. That programmatic button click is not used for haptics. The switch is parked with a renderer retained. Its frame isolates native mouse capture from the separate pencil control in the main document.

The same frame/input moves over the quantity pill when the pencil opens it. Real pointer/touch handlers convert child-frame coordinates to parent viewport coordinates. No synthetic haptic events or owed-tick replay are introduced. Warm state can survive an ordinary menu close without resetting checkedness, while a native tap on a quantity still cools the switch as before. Cancellation, page exit, hiding, and drawer closure clear it. If a native click still arrives, the code marks the seed cold rather than claiming it remained warm.

Source basis: [WebKit CheckboxInputType](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp), [EventHandler pending click invalidation](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/EventHandler.cpp), and [InputType renderer detach](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/InputType.cpp).

This is an experimental use of native controls, not a supported Safari haptics API. WebKit's iOS compatibility-click route and physical Taptic feedback must be checked on the owner's phone. First opening through a keyboard does not prime touch haptics. Tapping a quantity still resets native warmth. Do not claim every possible first gesture or physical tick is verified.

## Verification

- `node --check theme-draft/assets/theme-r3.js`.
- `node --test tests/quantity-haptics.test.mjs`: 38 passing tests, including first primed move before 200ms, checkedness retention, frame coordinates/coalesced samples, rejection of drags/cancellation/untrusted input, pencil markup retention, cleanup without a stuck pointer drag, avoidance of buttons covered by another interface, native-click fallback, and all previous tests.
- `node work/verify-quantity-motion.mjs`: 82 exactly matching old/new samples for opening, rapid drag/reversal, release, and closing, against the freshly pulled draft baseline.
- Bundled Liquid validation cannot start because `@shopify/theme-check-common` is missing. Installed Shopify Theme Check reports the existing 23 errors and 8 warnings, with no offense in the edited asset.
- Local Chromium fixture uses the real selector code with feature-detection seams for a non-switch browser and a real mouse activation instead of a qualifying touch. It verifies iframe initialization, real mouse-up click-node removal, primed adoption, exact pill/frame alignment, dragging 1 to 5, preview, save, and close with no console errors. It does not emulate an iPhone motor or prove the Safari compatibility route.

Before uploading, pull the remote asset into `work/quantity-pencil-prime-20261003/pre-push/` and compare it to `baseline/`. Preserve any changes made by Claude. After uploading, pull into `verified/` and compare normalized contents before reporting deployment. Check the real preview and remove only the temporary test cart item.

On 2026-10-03, the fresh pre-push asset matched the baseline; the shared Git branch had not moved. Only `assets/theme-r3.js` was uploaded to the confirmed unpublished target and pulled into `verified/`. Its normalized contents matched the working file. The real 390 × 844 Chromium draft preview passed Add to bag, pencil opening, a drag from 1 to 5, live prices and free-shipping preview, closing, saved quantity 5 after reload, and keyboard Remove. Only the temporary Core Gold 10,000mAh item was removed, restoring the original empty cart. No console errors were captured. The settled selector screenshot is `work/quantity-pencil-prime-20261003/verified/mobile-selector.jpg`. Physical Safari feedback is still unverified.

Owner acceptance: reload the draft, open the bag normally (try both Your bag and Add to bag), tap the pencil and immediately make a quick first swipe. Confirm both the pencil tick and first-swipe ticks. Also try a swipe beginning on each bag-opening button to check normal page scrolling, repeated pencil openings, quantity taps, and drawer closing. If either haptics or scrolling regress, revert only this trial.

## Rollback

The exact previous asset is saved in `work/quantity-pencil-prime-20261003/baseline/assets/theme-r3.js` and Git parent `93a5979` contains the previous implementation. Reverse this task's patch after inspecting the current file for newer Claude edits; do not replace the entire asset blindly. Validate, upload only that asset to the same unpublished draft with `--nodelete`, and pull it back to verify. Never reset unrelated work or force-push GitHub.
