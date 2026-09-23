# Prompt: mobile sticky "Add to bag" bar (Voltical product page)

Paste this whole file to any AI model or developer working on the sticky
Add-to-bag bar. It describes what the owner requires, how the current
implementation meets it, what was tried and failed, and how to test.

---

You are working on the sticky Add-to-bag bar on the product page of a Shopify
theme (store `imraiy-tv.myshopify.com`, domain `www.voltical.store`). The
working implementation is in `theme-draft/sections/main-product.liquid`, in the
script block that begins with the comment `Add to cart sticky bar — ONE
button, no clone`. The bar's look comes from `.pdp--bold .atc.is-pinned` in
`theme-draft/assets/voltical-pdp-bold.css`.

Read `AGENTS.md` first and follow it. It covers draft-theme safety, the
compare-section invariants and the required verification.

## Ground rules

- Only ever push to the unpublished draft theme **#193289027910** ("Claud and
  codex theme"). Never touch, publish or push to the live theme. Never use
  `--live`, `--publish` or `--allow-live`.
- Before every push, confirm the target is still unpublished (`shopify theme
  list`). After every push, pull the file back and diff it against the working
  tree to prove the deploy matches.
- `voltical-pdp-bold.css`, `snippets/pdp-compare-inline.liquid` and
  `snippets/pdp-canva-editor.liquid` form one coupled system. Don't edit them
  to make the sticky bar work, and never hand-edit `CANVA-BAKED` regions.
- Never print or commit the Shopify theme token.

## The requirements (from the store owner, all must hold at once)

1. **Mobile product pages only.** Desktop (≥ 900px wide) must be unchanged.
2. The normal Add-to-bag button starts in its regular place in the page.
3. **Scrolling down never activates the sticky bar.**
4. If the normal button hasn't fully left the top of the screen, scrolling
   back up activates nothing.
5. Once the normal button is fully above the screen, the sticky bar may appear
   at the bottom, **but only when the user starts scrolling up.**
6. **Activation is perfectly smooth:** no page jump, skip, slide, bounce or
   content shift of any kind.
7. While sticky, it stays fixed at the bottom and works exactly like the
   normal button. It is the same element, not a clone, so there are never two
   buttons.
8. **The button's original space must already be closed** by the time the
   user scrolls back up to where it was. The owner must never see an empty
   gap where the button used to be.
9. As the user keeps scrolling up and the button's original spot reaches the
   bar, the bar **fuses seamlessly back into place**. The fuse must not change
   the scroll position or cause a gap, height change, rubber-band, flash or
   jump. The owner considers the current fuse perfect, so don't change how it
   looks.
10. After fusing, it must not re-activate during the same upward journey. Once
    the button's spot has passed below the screen, it's correct for no
    Add-to-bag to be visible at all.
11. **Scrolling down again while the bar is showing hides the bar.** A genuine
    downward scroll also resets the cycle.
12. iPhone/Safari elastic overscroll (rubber-banding at the top or bottom) must
    never falsely activate or hide anything.
13. It must behave the same at slow, normal and very fast scroll speeds.
    Repeated direction changes must not cause duplicate buttons, flicker or
    wrong states.
14. The rest of the page's layout, spacing and behaviour stays unchanged.
15. **After scrolling all the way back to the top, the page must look and
    behave exactly as before.** No layout differences, spacing changes, jumps,
    delayed corrections, leftover placeholders or animation.
16. No visible debug UI. The diagnostic readout appears only with
    `?atcdebug=1` in the URL.

The hard part is requirement 8 together with 6 and 15. Removing the
button's space while it's above the screen shortens the page above what the
user is looking at. Unless the scroll position moves up by exactly the same
amount in the same frame, the visible content jumps.

## How the current implementation works

The state machine is `flow` (normal button), `reserved` (sticky, space still
held by an invisible spacer) and `pinned` (sticky, space closed).

1. **Pin (activation):** the button gets `is-pinned` (position fixed, bottom
   0). In the same synchronous frame, an invisible spacer of the button's
   exact flow height (`calibrate()` measures it up front, margins included)
   takes its place, so nothing moves.
2. **Close the space, first choice: native scroll anchoring.** Hiding the
   spacer with `display:none` (never a height change) lets the browser's own
   CSS scroll anchoring move the scroll position with the content. This works
   mid-drag and mid-fling. Each attempt measures whether the content actually
   stayed put. If not, it's undone in the same frame (unseen) and retried on
   the next frame.
3. **Close the space, second choice: when the page is still.** When no scroll
   event has fired for 120ms (60ms after a touch that stops momentum), the page
   isn't moving. The space is closed then with an exact `scrollTo`
   correction, which is invisible because nothing is moving. **This works
   with a finger resting on the screen.** Waiting for the finger to lift
   missed the common "flick down, catch, swipe up" pattern.
4. **Close early:** if the page comes to rest with the button above the screen
   while still in `flow` (the user scrolled down past it, or the page was
   opened or refreshed partway down), the space is closed right then. The
   button is lifted out of flow but kept `visibility:hidden`. When the user
   later scrolls up, the bar just becomes visible, with no layout change at that
   moment. In practice this is the path that closes the space on a real
   iPhone.
5. **Fuse:** when the slot's top plus the slot-to-button offset reaches the
   pinned button's top, `is-pinned` is removed. The page grows only below
   that line, which is off-screen, so nothing visible moves.
6. **Direction** uses a 6px hysteresis on clamped scroll positions, which
   ignores rubber-band overscroll. After a fuse, `armed` is false until a
   genuine downward scroll.

### Page-specific obstacles to scroll anchoring (why the helper code exists)

- `.pdp--bold .pinfo__below { overflow-anchor: none; }` in the coupled CSS
  blocks anchoring for everything below the button. The script sets
  `overflow-anchor:auto` on it inline, only while the button's spot is above
  the screen.
- The compare cards are `overflow:hidden` and `[data-reveal]` elements have
  `overflow-anchor:none !important`, so there's often nothing the browser will
  anchor to. An invisible 1px absolutely positioned helper inside
  `.pinfo__below` is parked mid-screen to serve as the anchor.
- Any `position` change, or any height or margin change, in the same layout
  stops the browser anchoring. So does a running layout animation (the reveal
  cards). That's why the pin frame and the close frame are separate, and why
  the close uses a `display` switch.
- WebKit picks its anchor only during a rendering-step layout. A per-frame
  text toggle on an invisible fixed node (`poke`) keeps the anchor fresh.
- The theme sets `html { scroll-behavior: smooth }`. Every correction
  `scrollTo` must temporarily force `scroll-behavior: auto` (see `jumpTo`).

### What failed on a real iPhone (don't repeat)

- **A `scrollTo` during a drag or momentum scroll:** iOS applies it late or
  against a stale position, and the whole page visibly jumps.
- **Relying only on scroll anchoring:** it works in emulators, but on real
  iPhones it succeeded only about half the time.
- **Closing only when the finger is lifted:** missed "catch and reverse"
  scrolling.
- **Re-measuring layout on `load` or `resize` mid-scroll:** the iPhone
  toolbar resizes the screen during the first scroll down. Re-measures now
  wait for a still page.
- **Cloned sticky buttons, sliding animations, and "borrowed height" spacers
  closed with a transition:** all rejected for duplicate buttons, visible
  motion or rubber-banding at the top.

## The custom scroll bar on the same page

iPhone Safari's own scroll bar runs up behind its see-through address bar, so
at the top of the page it disappears into the corner. The owner didn't want
that. The block after the sticky-cart script (comment `Scroll bar (mobile
only)`) hides the native bar and draws a thin one:

- 3px wide, `rgba(0,0,0,.52)`, rounded.
- The track starts at `top:-3px`, so at the top of the page it starts flat,
  right on the line under the address bar.
- Its length is `0.68 × track height × screen height ÷ page height`, with a
  minimum of 30px.
- It fades in while scrolling and out 700ms after scrolling stops.

It uses only `transform` and `opacity`, so it never affects layout or scroll
anchoring. Keep it that way.

## How to test

- **Emulators:** Playwright WebKit and Chromium with the `iPhone 13` device.
  Load `https://imraiy-tv.myshopify.com/products/voltical-core-pro-5k-10k?preview_theme_id=193289027910`.
  Add `&atcdebug=1` for the state readout.
- **Real touch in Chromium:** use CDP `Input.dispatchTouchEvent`
  (`touchStart`/`touchMove`/`touchEnd`). Record, per frame, the median
  on-screen movement of visible elements. Any non-zero movement while the
  finger is still is a visible jump.
- **The emulators don't reproduce** real iOS momentum, the toolbar
  resizing, or Safari's scroll bar. Things that pass in emulators have
  failed on the owner's iPhone.
- **Confirm on the owner's iPhone:** ask for a screen recording. Decode it
  with a full ffmpeg (for example `pip install imageio-ffmpeg`). Estimate the
  vertical shift between consecutive frames, and view the frames around
  activation, the space closing and the fuse. That is the real acceptance
  test.
- **Before claiming anything works:** check requirements 3, 5, 6, 8, 9, 11, 12
  and 15 at slow and fast speeds, starting from the top and from a page
  refreshed partway down.
