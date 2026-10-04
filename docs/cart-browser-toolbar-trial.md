# Cart browser-toolbar trial

This is an opt-in experiment, not a confirmed Safari or Google-app feature.
The browser owns its toolbar. A script cannot assume that scrolling the
document will collapse it. The owner's iPhone is the acceptance test.

## Enable and disable

Open the unpublished draft product preview with `&carttoolbar=1`:

<https://imraiy-tv.myshopify.com/products/voltical-core-5k-10k?preview_theme_id=193289027910&carttoolbar=1>

Without this parameter, the existing drawer follows its original open/close
path. No persistent storage or theme setting enables the experiment. The
theme editor and desktop are excluded.

## Implementation

Only `theme-draft/assets/theme-r3.js` is deployed. The isolated
`cartToolbarTrial` helper runs before the other JavaScript modules. The
existing drawer calls it at open and at `finishClose`. The quantity selector,
its native haptic controls, and the sticky-button state machine are not edited.

When the page is still, the helper increases the body's top padding by 96 CSS
pixels and instantly advances the root scroll offset by the same amount in
one synchronous operation. Normal-flow content stays in the same place.
It checks the main content and header positions immediately; a rejected
scroll or detected shift causes an immediate rollback.

It temporarily disables transitions on the body's compensation, root scroll
anchoring, and smooth scrolling; this also avoids the theme's global
reduced-motion transition duration turning the padding change into an animation.
It suppresses
the trial's root scroll events from the background's listeners, and applies
the normal drawer scroll lock after 240ms. It does not suppress scroll events
inside the cart. A viewport resize realigns the resting drawer to its bottom
position, but not while it is being dragged or closed.

Closing restores the exact saved root offset and original inline CSS values
and priorities, cancels the delayed lock and viewport fit, and allows real
touch scrolling immediately. Page exit or crossing the desktop boundary
unwinds the nudge while retaining the normal open-drawer scroll lock.

The trial skips active page scrolling, an unreleased page touch, zoom,
rubber-banding, an already scroll-locked page, and a pinned sticky Add-to-bag
button. Skipping leaves the normal drawer behavior intact. For the initial
phone test, open the header's bag icon while the page is at rest.

There is no visible diagnostic panel. On the test link only,
`window.__voltCartToolbarTrial.events` records whether the attempt was nudged,
skipped, rolled back, or restored and any visual-viewport height changes.
These are diagnostic observations, not proof that a native toolbar collapsed.

## Checks and acceptance

Run `node --test tests/cart-toolbar-trial.test.mjs tests/quantity-haptics.test.mjs`.
The tests cover isolation, no content movement in the model, exact restoration,
rapid close/reopen, cancellation, zoom and scrolling guards, nested scroll
events, viewport changes, and the existing quantity/haptic behavior.

The local `work/cart-toolbar-20261004/fixture.mjs` serves the actual helper and
drawer animation code for a rendered layout/restore check. Its coarse-pointer
setting is a fixture override, not a production override or an iPhone test.

On the owner's iPhone, test Safari and the Google app separately:

1. Start with expanded browser controls and let the page stop moving.
2. Open the header's bag icon without swiping the page first.
3. Check whether the browser controls shrink by themselves.
4. Close the drawer and check that the background has not moved.
5. Repeat and check the pencil, quantity dragging, inner cart scrolling, and
   drawer dismissal. Record a screen recording if any movement occurs.

Do not claim automatic toolbar collapse until this hardware test succeeds.

## Surgical rollback

Immediate disable: remove `carttoolbar=1` from the URL and reload.

For removal from the shared source, remove the `cartToolbarTrial` helper and
its two drawer call sites, restoring the original `body.style.overflow` lines.
Preserve any later Claude edits to the same file. Do not overwrite the whole
asset with an old snapshot. Then follow AGENTS.md's file-scoped draft push and
pull-back verification workflow.
