# Retired cart browser-toolbar trial

## Result: failed on the owner's iPhone

The owner reported that the Google app's bottom controls stayed expanded when
opening the drawer, and that the product page jumped slightly on dismissal.
The compensated root-scroll approach therefore failed acceptance. A document
offset changing does not prove the browser's native toolbar will collapse.

The experiment has been removed from `theme-draft/assets/theme-r3.js`.
`carttoolbar=1` no longer enables anything. Open and close use the original
immediate body-overflow lock and unlock. No root scroll correction, body
padding compensation, delayed lock, or trial scroll-event interception remains.
Claude's quantity controls, haptics, drawer animations and other cart work are
preserved. The old experiment is recoverable from Git commit `ec71807`; do not
restore the entire old asset over newer work.

## What was tried

The opt-in helper added 96 CSS pixels of body top padding and advanced the
document scroll offset by 96 pixels in one synchronous operation. The aim was
to keep the visible content still while provoking a native toolbar collapse.
It locked background scrolling after 240ms and restored the saved offset and
styles on close. It passed desktop rendered/model checks but not the real-phone
test. Do not treat those checks as proof of iPhone browser behavior.

Chrome for iOS has native logic that explicitly ignores programmatic scrolling
unless the scroll view is dragging or decelerating. This is supporting evidence
about Chrome, not proof that the separate Google app uses the same code:

<https://chromium.googlesource.com/chromium/src/+/d06a79f3bb5a201c230f5924004be6f26f4f5219/ios/chrome/browser/fullscreen/coordinator/fullscreen_mediator.mm>

There is no verified tap-only website solution from this trial. Do not repeat
the same nudge with a larger distance or another timing and claim it works.
A new approach needs evidence and real-device acceptance before deployment as
normal cart behavior. Requiring a swipe would change the requested interaction.

## Rollback checks

Run `node --test tests/cart-toolbar-rollback.test.mjs tests/quantity-haptics.test.mjs`.
These verify the retired flag has no hooks, open/close do not scroll the root or
change compensation styles, repeated drawer cycles preserve the model offset,
and the existing quantity/haptic tests continue to pass.

After a file-scoped Shopify draft push, pull back `assets/theme-r3.js` and compare
it with the working copy. On the owner's iPhone, reload the draft before testing
open/close so an older loaded script cannot keep the removed trial active.
