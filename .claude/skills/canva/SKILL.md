---
name: canva
description: >-
  Turn the Voltical Core product page's compare tile section ("See how Core
  upgrades your experience") into a Canva-style, full-canvas drag-and-drop
  editor in the theme preview — click a tile to move it, double-click to grab
  the image/text/icon inside (or to type into a caption), drag or scroll to
  resize, arrows to nudge. Use this skill whenever the user types /canva, says
  "canva mode", asks to move, drag, resize, retype, or reposition the compare
  tiles / calculator tiles / their images or text on the product page by hand
  instead of by pixel nudges, or says "lock it" / "lock in the layout" to bake
  the dragged layout (and any typed caption edits) permanently into the theme,
  or says "line things up" / "align" / "straighten" / "snap it into place" to
  clean up small drift after dragging tiles around. Also use it if they ask to
  re-enter, adjust, reset, or remove that editor.
---

# Canva editor for the compare tile section

This skill runs a live, in-browser layout editor over the compare tile block
on the Core product page, so the user can arrange tiles, images, text and
icons visually (like elements on a Canva page) instead of asking for repeated
"move it 10px right / down 5px" CSS edits. When they're happy, "lock it" bakes
the exact layout into the desktop CSS so it becomes the real, permanent layout.

## The store this operates on

- **Store:** `imraiy-tv.myshopify.com`
- **Draft theme (always this one, never the live theme):** `193289027910` ("Claud and codex theme")
- **Product page:** `voltical-core-5k-10k`
- **Local theme path:** `theme-draft/`
- **Git branch:** `claude/shopify-cli-setup-5ih4po`
- **Push command shape:**
  `shopify theme push --store imraiy-tv.myshopify.com --theme 193289027910 --only <file> --path theme-draft`

The two files this skill owns:
- `theme-draft/snippets/pdp-canva-editor.liquid` — the editor (self-contained CSS+JS). Rendered right after `{% render 'pdp-compare-inline' %}` in `theme-draft/sections/main-product.liquid`.
- `theme-draft/assets/voltical-pdp-bold.css` — where baked layouts land (inside `@media (min-width: 900px)`).

## Command 1 — enter / re-enter edit mode (`/canva`)

The editor ships inside the theme already. Entering edit mode is just a URL flag, so there is usually nothing to push. When the user invokes `/canva`:

1. Confirm the editor is still wired up (a quick check that `pdp-canva-editor` is rendered in `main-product.liquid` and the snippet exists). If it was removed, re-add the `{% render 'pdp-canva-editor' %}` line after the compare render and push both files.
2. Hand the user this preview link and the controls:

   **Open:** `https://imraiy-tv.myshopify.com/products/voltical-core-5k-10k?preview_theme_id=193289027910&edit=1`

   - **Click a tile** → selects the whole tile; drag to move it.
   - **Double-click** inside a tile → grabs the exact image / text / icon under the cursor (then drag it, or press-drag again — the selection is sticky).
   - **Resize:** drag a corner handle, or scroll the mouse wheel over the selected element.
   - **Nudge:** arrow keys (Shift = 10px steps). **Esc** deselects.
   - **Align:** snaps small accidental drift (up to 14px, or 40px with Shift+click) on the selected element back to its perfect position — or, if nothing is selected, across every tile, image, icon and text box at once. Deliberate larger moves are left alone. Tiles snap to whichever of the 6 grid slots they're now CLOSEST to (not just back to their own original slot) — so to swap two tiles, drag each roughly into the other's spot and click Align to lock both exactly into place; this works because a tile's real grid cell never actually moves when dragged, only its on-screen transform does, so all 6 real slots are always known. Everything a tile contains (images, icons, text) only ever gets its horizontal position snapped (dead-center in its tile) — vertical position is left alone, since it's anchored by its own CSS on purpose. Safe to click any time something looks slightly off after dragging.
   - **Typing:** double-click a caption/heading (`.pdp-cmp__eyebrow`, `.pdp-cmp__sub`, `.pdp-cmp__select-heading` — anything that's literal text, not one of the live-computed numbers) to drill into it, same as any image/icon — it's still draggable with a single click-hold from there. With it selected, press **Enter** to start typing into it in its own font; the cursor lands at the end of the existing text, so it's additive. Press **Enter** again to start a new line lower in the same box. Click elsewhere or press **Esc** to stop typing and save. (Drag and type are deliberately separate gestures — double-click always drills/selects, Enter is what switches a selected caption into typing — so dragging a caption never gets hijacked into typing mode.)
   - **Reset one / Reset all** buttons in the toolbar (typed caption edits survive a reset — only position/size resets); **Done** exits edit mode.
3. Tell them: drag everything into place, then say **"lock it"** (pasting the "Copy layout" code, or I'll ask for it).

Edit mode is **sticky** — the `?edit=1` sets a `localStorage` flag (`volt-canva-on`) so it survives reloads while they fine-tune. It only lives in *their* browser; ordinary visitors never see any controls. "Done" (or `?edit=0`) clears the flag.

Their drags save live to `localStorage` (`volt-canva-layout`) and are re-applied on every load — even outside edit mode — so the preview always reflects work-in-progress. That is only in their browser; it is **not** real for other visitors until baked (Command 2).

## Command 2 — "lock it" (bake the layout into the theme, permanently)

When the user says "lock it", they should give you the JSON from the editor's
**Copy layout** button. If they haven't, ask them to click it and paste it (it's
already on their clipboard). The payload looks like:

```json
{ "v": 1, "note": "...", "items": [
  { "sel": ".pdp-cmp>:nth-child(2)>:nth-child(2)", "kind": "tile",
    "dx": 23, "dy": 18.4, "s": 1, "base": "none" },
  { "sel": ".pdp-cmp>:nth-child(2)>:nth-child(1)>:nth-child(1)", "kind": "text",
    "dx": 0, "dy": 0, "s": 1, "base": "none", "text": "Strong magnet<br>for perfect fit" }
] }
```

Each item is one changed element: `sel` is a structural selector rooted at
`.pdp-cmp`, `dx`/`dy` are the move in the element's **local** units, `s` is the
scale multiplier, `base` is the element's original computed transform (a
`matrix(...)` string, or `"none"`), and an item only carries a `text` field if
its caption/heading content was retyped (position/size and text are
independent — an item can have one, the other, or both).

### Baking recipe — position/size (every item)

Reproduce, in CSS, the exact transform the editor's JS applied — which is
`translate(dx,dy) scale(s) <base>`, in that order:

For each item, the transform **value** is:
`translate(<dx>px, <dy>px)` + (if `s` ≠ 1) ` scale(<s>)` + (if `base` ≠ `"none"`) ` <base>`.

Emit each as a rule with `!important` (the structural selectors have low
specificity and must beat rules like `.template-product .pdp-cmp__card--charge .pdp-cmp__stat`):

```css
/* CANVA-BAKED-START — generated by the /canva skill; do not hand-edit */
@media (min-width: 900px) {
  .pdp-cmp>:nth-child(2)>:nth-child(2){ transform: translate(23px, 18.4px) !important; }
  /* ...one line per item that moved/resized... */
}
/* CANVA-BAKED-END */
```

Placement rules:
- Keep everything **between the `CANVA-BAKED-START` / `-END` markers**. On each
  "lock it", **replace** the content between the markers rather than stacking a
  new block. If the markers don't exist yet, append the whole block at the very
  end of `voltical-pdp-bold.css` (last in source order → wins ties).
- Only emit items that actually moved (`dx`/`dy` non-zero or `s` ≠ 1) into this
  CSS block — an item that's ONLY a text edit (no transform) doesn't need a
  transform rule at all.

### Baking recipe — typed text (items carrying a `text` field)

This part edits `theme-draft/snippets/pdp-compare-inline.liquid` directly, not
CSS. Each `text`-bearing item's `sel` tells you exactly which element changed —
walk it against the real markup in that file to find the matching tag (use the
`kind` and the tile it's inside as a sanity check: e.g. `.pdp-cmp__sub` inside
the magnet card is the "Strong magnet" line). Replace that element's inner
content with the item's `text` value verbatim — it's already the correct
literal HTML (plain text plus `<br>` line breaks exactly where the user placed
them), so no reformatting or Liquid-escaping is needed beyond what the rest of
the file already does for static copy.

Also add `style="white-space:nowrap"` to that same tag (or fold `white-space:
nowrap` into an existing `style` attribute if it already has one). The editor
applies this live to any box that's been retyped, specifically so the line
only ever breaks where the user put an explicit `<br>` — without it, normal
word-wrap can still kick in on its own once the box is narrower than the text
(e.g. on an actual mobile viewport, or if the tile gets resized later), which
would silently defeat the manual line breaks the user placed on purpose.

Do **not** apply this to elements carrying `data-calc-*` attributes — those
are computed live by the compare script and are never text-editable in the
editor in the first place, so a `text` field should never appear for them; if
one somehow does, treat it as a bug rather than baking it.

### Avoid the double-apply footgun (important)

The editor re-applies the `localStorage` layout on every load, *including outside
edit mode*. If you bake the layout into CSS but leave that browser copy live, the
user's own browser would apply the move **twice** (once from CSS, once from JS) —
everything would drift to roughly double the offset. Customers are unaffected
(they have no `localStorage`), but the user would see it and think the bake was
wrong.

Fix it as part of every "lock it": **bump the storage key** in
`pdp-canva-editor.liquid`. Find:

```js
var LKEY = 'volt-canva-layout';
```

and increment it (`volt-canva-layout-2`, `-3`, …). This orphans the browser's old
saved layout so the baked CSS becomes the single source of truth on the next
load. If they re-enter edit mode later, they start cleanly from the baked
positions (the editor reads each element's now-baked transform as its new base).

### Finish the bake

1. Edit `voltical-pdp-bold.css` (baked block) and `pdp-canva-editor.liquid` (LKEY bump).
2. Push both:
   `shopify theme push --store imraiy-tv.myshopify.com --theme 193289027910 --only assets/voltical-pdp-bold.css --only snippets/pdp-canva-editor.liquid --path theme-draft`
3. Commit and push to the git branch with a clear message.
4. Tell the user to **reload the preview** — they'll see the baked layout, and their old in-browser edits are superseded automatically. If they want to keep tweaking, they can re-open with `?edit=1` and it picks up from the baked positions.

## Why the coordinate math works (so you can trust / extend it)

The compare block sits under a compound transform: `.pdp-cmp { transform: scale(3) }`
× `.pdp-cmp__grid { transform: scale(1.449) }` = **4.347×**, plus a translate on
`.pdp-cmp-wrap`. The editor applies the user's move as the **outermost** transform
(`translate(dx,dy) scale(s) <base>`), so `dx`/`dy` are in the element's own local
coordinate units. To keep dragging 1:1 with the cursor, a screen-pixel delta is
divided by the element's **cumulative ancestor scale** (computed at runtime by
multiplying the `DOMMatrix.a/.d` of each ancestor — no hardcoded numbers). That's
why baking = replaying `translate(dx,dy) scale(s) <base>` verbatim in CSS gives
pixel-identical results to what the user saw.

This is a **desktop tool**: the compare grid only uses its big scaled layout at
`≥900px`, so the editor's handles only appear there, and baked rules go inside the
`@media (min-width: 900px)` block. It deliberately does not touch the mobile
layout.

## Removing the editor (only if asked)

Delete the `{% render 'pdp-canva-editor' %}` line from `main-product.liquid` and
(optionally) the snippet file, then push. Any baked layout in the CSS stays — it's
independent of the editor.
