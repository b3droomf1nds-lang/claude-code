# Liquid Glass lens edge (cart sheet)

The cart sheet's top edge bends the page under it like the clear iOS 26 Liquid Glass sheets. The effect is measured, not eyeballed: every number below comes from the owner's iPhone screen recording of the Notification Centre sheet being pulled down over an app (2026-10-15, 1170 × 2532, 14.3 s). It runs on the owner's iPhone since commit `3f63cd2`.

- **Code:** the `lensHalt` IIFE in `theme-draft/assets/theme-r3.js`, inside the cart sheet code. It sits just after the `.drawer-scroller` setup.
- **Styles:** the `.drawer-lens*` rules in `theme-draft/assets/theme-r2.css`, plus `@property --rb` beside `.drawer-scroller .drawer`.
- **Deploying:** only to draft `193289027910`, following `AGENTS.md`.

Read this before changing the lens, porting it to another element, or re-measuring it.

## 1. What the iOS edge does

### Anatomy

`d` is the distance from the rim into the glass, in pt (CSS px on an iPhone). The glass never shows what is directly under a point. It shows the page from further in, at depth `at(d)`, pulled along the inward normal.

```
 rim ─┬─ d = 0     shows depth 26.1 (green), 38.8 (red), 14.9 (blue)  ← colours most apart, haze 66%
      │  0 – 5     haze: fades towards the glass's own colour (66% → 0)
      │  0 – 6     colours part: red from deeper, blue from shallower → fringes on edges
      │  0 – 12.4  MIRROR: the strip 20.8 → 26.1 deep shown again, upside down
      │            (about 1.25× at the rim, rising towards the fold)
      ├─ 12.4      FOLD: one line (depth 20.84) drawn out into streaks ("hourglass drips")
      │ 12.4–31.4  STRETCH: depths 20.8 → 31.4 pulled towards the rim, stretched more and
      │            more (1× at 31.4, ~2× at 20, ∞ at the fold)
      └─ 31.4      flat: 1:1, no lens
```

Anything within about 20.8 pt of the rim is never visible: the glass replaces it with the stretched and mirrored strip from 20.8 to 31.4 pt in. As content moves towards the edge, its stretched image slides up to the fold. Its mirror image comes in from the rim, and the two meet at the fold and vanish.

### Formulas

All values are in pt, measured over 121 frames.

```js
const B = 31.41;                                                    // band depth: flat beyond it
const at = (d, c) => {                                              // depth shown at d, per colour
  let s = d + 26.14 * Math.max(0, 1 - d / B) ** 2.251;              // green: rms error 0.065pt
  if (c === 'r') s += 12.65 * Math.max(0, 1 - d / 6.1) ** 2.29;     // red from deeper (rms 0.28pt)
  else if (c === 'b') s -= 11.28 * Math.max(0, 1 - d / 9.07) ** 3.98; // blue from shallower (rms 0.1pt)
  return s;
};
```

- **Fold:** at d = 12.39, where green is at its minimum depth of 20.84.
- **Rim:** at d = 0, the formulas give 26.14 for green, 38.79 for red and 14.86 for blue.
- **Fit quality:** the green fit is excellent everywhere. Within about 1.5 pt of the rim the data is noisy, and the measured green runs about 1 pt deeper than the fit.

**Measured green depths:**

| d | 0.33 | 1 | 2 | 3 | 4 | 5 | 6.67 | 8 | 10 | 12.33 | 15 | 16.67 | 20 | 23.33 | 26.67 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| at(d) | 27.06 | 26.27 | 24.93 | 24.23 | 23.53 | 22.93 | 22.00 | 21.49 | 21.00 | 20.82 | 21.06 | 21.46 | 22.73 | 24.56 | 27.03 | 30.07 |

**Measured colour split** (red minus green, blue minus green):

| d | 1 | 1.33 | 1.67 | 2 | 2.33 | 2.67 | 3 | 3.33 | 4 | 4.67 | 5.33 | 6 | 6.67 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R−G | +7.7 | +7.9 | +6.3 | +5.2 | +4.0 | +3.6 | +2.3 | +1.7 | +1.3 | +0.5 | +0.3 | +0.1 | 0 |
| B−G | −7.1 | −6.0 | −5.0 | −4.1 | −3.6 | −2.5 | −2.3 | −1.8 | −1.2 | −0.7 | −0.3 | −0.1 | 0 |

So red is pulled from deeper and blue from shallower than green. That is the reverse of real glass, but it is what Apple draws. Blue has a second fold near d ≈ 4.7 and turns back towards the rim.

**Haze.** The share of the rim's content replaced by the glass's average colour (a blend, not a blur):

| d | 0.33 | 0.67 | 1 | 1.33 | 1.67 | 2 | 2.33 | 2.67 | 3 | 3.33 | 3.67 | 4 | 4.33 | 4.67 | 5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mix | .64 | .55 | .51 | .46 | .46 | .40 | .33 | .24 | .17 | .15 | .13 | .08 | .06 | .02 | 0 |

Horizontally blurring the source never improved the match, so it isn't blur.

### Other observations

- **Tint.** The clear sheet passes 45% of what's under it: out = 0.448 × in + 3.4. The tint is the same across the band and the interior, so the band never reads as a strip.
- **Colours come from content.** On blank areas there is almost no colour, only a faint cyan hairline in the last ~1 pt (red −14%). A stronger cyan sits on the right side's outer 2 px and a slight orange on the left. Mirrored dark text shows yellow/orange cores, blue/purple outlines, magenta lower edges and cyan streaks between letters. Rainbows only appear where something passes under the rim, so don't paint a fixed spectrum.
- **Corners and sides.** The sheet's corners are 48 pt circles. The lens follows the curve: a point at radius ρ from the corner centre shows the content at the same angle, radius `r − at(r − ρ)`. That is why text near a corner looks slanted and bent along the arc. The sides carry the same profile horizontally.
- **Behind the sheet.** As the sheet comes down, the app behind recedes (scale 0.997 about the screen centre) and dims outside the sheet. This matters only when measuring.

## 2. How the cart sheet does it

### Why page copies

Safari can't distort what is behind an element:
- `backdrop-filter: url(#svg)` renders nothing ([WebKit bug 245510](https://bugs.webkit.org/show_bug.cgi?id=245510)).
- `-apple-visual-effect` is private.
- `filter: url()` with `feDisplacementMap` on an element is supported, but `feImage` (needed for a displacement map) has a history of making the element vanish. It is untested on the owner's iPhone.

So the band holds live DOM copies of the page (`#main` and the footer), lined up with the real page every frame and stretched with plain CSS transforms.

### Structure

```
.drawer (card; paint order: ::before frost → .drawer-lens → ::after edge light, all z 0 → children z 1)
└─ .drawer-lens            band: abs inset 0, z 0, overflow hidden, border-radius inherit,
   │                       pointer-events none, inert, aria-hidden; mask fades 24.5→31.4px
   ├─ .drawer-lens__slice  one per [d0,d1): top d0, height d1−d0+1 (1px under the next)
   │  └─ .drawer-lens__view  shadow host; transform-origin 0 0; transform set per frame
   │     └─ #shadow-root   clones of the page's <link>/<style> tags + a <body> stand-in
   │                       (body classes and background) holding the copied #main/footer
   ├─ … split slices: three .drawer-lens__ch groups (r, g, b), each a view plus an <i>
   ├─ .drawer-lens__haze   rim haze (z 1 inside the band)
   └─ ::after              the glass tint
```

### The slice maths

A slice covering band depths [d0, d1) shows page depths [at(d0), at(d1)] linearly:

```js
const s = (d1 - d0) / (at(d1, c) - at(d0, c));        // band px per page px; negative = mirrored
// every frame (only if main/band moved): y = main.top - band.top, x = main.left - band.left
view.style.transform = `translate(${x}px, ${s * (y - at(d0, c))}px) scaleY(${s})`;
```

The current cuts give 10 copies:

```js
const CUTS = [0, 2.25, 6, 12.39, 19, 24.5, B];        // slices ending at or above SPLIT = 6 are split r/g/b
```

| slice | channel | from | scale s | max error (pt) |
|---|---|---|---|---|
| 0–2.25 | R / G / B | 38.79 / 26.14 / 14.86 | −0.22 / −1.27 / 0.38 | 0.65 / 0.05 / 0.75 |
| 2.25–6 | R / G / B | 28.77 / 24.36 / 20.74 | −0.57 / −1.75 / 2.81 | 1.38 / 0.13 / 0.77 |
| 6–12.39 | G | 22.22 | −4.63 | 0.35 |
| 12.39–19 | G | 20.84 | 4.75 | 0.34 |
| 19–24.5 | G | 22.23 | 1.76 | 0.21 |
| 24.5–31.41 | G | 25.37 | 1.14 | 0.25 |

Put a cut exactly at the fold (12.39), or a chord across it is nearly flat and its scale runs away.

Keep |s| small in the blended (split) slices. An earlier 18-copy layout had a blue slice at −37×, which most likely hung Safari (see section 3).

### Colour split CSS

Each group keeps one channel by screening the other two to white. The groups then multiply back together:

```css
.drawer-lens__slice.is-split{isolation:isolate}
.drawer-lens__ch{position:absolute;inset:0;isolation:isolate;overflow:hidden;contain:strict}
.drawer-lens__ch+.drawer-lens__ch{mix-blend-mode:multiply}
.drawer-lens__ch>i{position:absolute;inset:0;mix-blend-mode:screen}
.drawer-lens__ch--r>i{background:#0ff}   /* keeps red */
.drawer-lens__ch--g>i{background:#f0f}   /* keeps green */
.drawer-lens__ch--b>i{background:#ff0}   /* keeps blue */
```

### Look on a frosted card

The cart sheet is frosted (`::before`: `rgba(248,248,250,.73)` plus `blur(5px) saturate(180%)`). Those values were measured from the Apple Store app's delivery card over a black iPhone and its light background: out = 0.733 × 248 + 0.267 × in, with a 10–90% edge width of about 13pt, which gives σ ≈ 5. What's behind stays recognisable as soft shapes. (The earlier `blur(44px)` at `.68` was much heavier, and the page vanished.) The band is glass on top of the frost:

- **Tint (`.drawer-lens::after`):** `rgba(237,237,239,.76)` applies the page's 12% scrim dim and then the frost's own 73% white, folded into one colour. The band therefore has the frost's brightness and contrast (27%) and fades into it with no step. Without a tint, the band reads as a grey bar over the white frost. For clear, unfrosted glass, use the iOS 45%.
- **Haze (`.drawer-lens__haze`):** white, following the table above (0.66 → 0 over 5 px), linear in the middle and radial in the 40 px corner tiles.
- **Mask:** `linear-gradient(#000 24.5px,#0000 31.4px) 0 0/100% 32px`, the same all the way across. Earlier radial corner masks ended the band in a hard line near the sides.
- **Corners:** 40 px on the card. The band is clipped by them, but the mapping stays vertical (see section 3 for why not radial).

### Making the copies faithful

Each copy is a `cloneNode(true)` of `#main` (and the footer only when within a quarter screen), placed absolutely at the original's rect inside a body stand-in in a shadow root.

- **Styles in:** clone the page's `<link rel=stylesheet>`/`<style>` tags into each shadow root. Cross-origin CSSOM (the myshopify preview against the `www.voltical.store` CDN) blocks `adoptedStyleSheets`.
- **Styles out:** the card's own styles must not leak in (`.drawer-scroller .addon` and the like), which the shadow root guarantees.
- **Inherited type:** give the host the page body's inherited type properties. Line-height reads back in px, so convert it to a unitless ratio (lh / fs); otherwise the copy drifts by many px over a long page.
- **Per-element fixes, by index between the original and the clone:**
  - `<img>` gets `currentSrc` with srcset/sizes removed and loading eager.
  - `<source>` inside `<picture>` is removed.
  - `<iframe>` loses its src.
  - `<video>` gets no autoplay and preload none.
  - `<input>` gets its checked state and value.
  - `<canvas>` has its pixels copied with drawImage.
  - Scroll offsets are restored after insertion.
  - Anything computed `position:fixed` is hidden, since it belongs to the screen, not the page.
- **Culling:** whatever lies wholly outside [−¼, +1¼] screen heights (`ROI = 0.25`) becomes an empty box of the same size. The band only shows the page just below the rim, the rim never rises past the top bar, and the page only scrolls while the card is leaving.
  - Normal-flow blocks get `margin-top`/`margin-bottom` pinned to their real gaps (from rects, printed with `toFixed(6)`, so never in e-notation).
  - Flex/grid items and absolute boxes get width and height plus `flex:none`.
  - Parents with floats, inline boxes, loose text, or transformed, offset or sticky children are left alone.
  - Rendering is pixel-identical to full copies; each copy holds 61–285 elements instead of 488.

### Lifecycle

0. **Prepare (once):** `prepare()` clones the page's style tags into every root 600 ms after `load` and keeps them for good. `stop()` removes only the copies. At an open, any tags the page has added since are put in, and the build waits for their loads (at most 1.5 s), so each copy is laid out once, styled.
1. **Start:** when the card gets `is-open`, start the rAF loop and build at once. Do not wait for the rise to finish: the rise is an animation that main-thread work doesn't hold up. Waiting for it, then for the link loads, made the glass appear about 1.3 s after the tap. It now appears in about 0.17 s, while the card is still rising.
2. **Build:**
   - Read the page (`pageNow()`: rects, fixed elements, cull plan) in a frame of its own.
   - Add one or two copies per frame (4 ms budget). If the page changed meanwhile, re-read it in the same frame as the copy.
   - **While the quantity slider is up (`qm`), do nothing.** Its iPhone ticks need every `touchmove` handled on time, and copies there made the first swipe miss ticks. `scripts/haptics-check.mjs` checks this.
3. **Live:** `align(true)`, then add `.is-live` (opacity fades in over .25 s). After that, `align()` only writes transforms when main or the band actually moved by at least 0.01 px.
4. **Repaint:**
   - A MutationObserver on main and the footer (childList, subtree, `class`/`hidden`/`open`) sets `stale` and repaints at most every 400 ms. It never repaints during a drag (`is-dragging`), while building, or while the quantity slider is up (`qm`). It catches up once the slider closes.
   - A page scroll of more than 0.8 × ROI (0.2 screens) re-reads the page.
   - Each slice keeps a reference to its current copy and swaps it whole.
5. **Halt and stop:** `close()` calls `lensHalt()` first, so no more copies or repaints run while the card leaves. Losing `is-open` runs `stop()`, which removes the copies but keeps the style tags.
6. **Give up:** if a build frame takes over 400 ms, a build step over 150 ms, or a repaint over 250 ms, the lens switches off for the rest of the visit, so the card can't stick. It doesn't trip at 6× CPU throttle.
7. **Off entirely:** with `prefers-reduced-transparency`, or when there is no `#main`.

## 3. Lessons (don't repeat these)

- **Stretch versus mirror.** Content comes from further inside the glass, never from outside the edge. My first version stretched from the rim outward and was "not even distorting it".
- **Fold placement.** The fold is 12.4 pt in with a 12.4 pt mirror zone, not a thin rim fold. The magnification rises to infinity at the fold. An earlier constant 2.5× stretch looked flat.
- **Huge scales in blended groups hang Safari.** Blend modes make WebKit composite the group. Without clipping, its layer covers the whole stretched page (a −37× slice is about a million device px tall). The bag stuck half-open and the X and page scrolling died. Keep `overflow:hidden; contain:strict` on slices and channel groups, and keep |s| small there.
- **Too many full copies freeze phones.** 18 full copies built while the card rose meant ~4.7 s of jank at 4× throttle. Culling plus one or two copies a frame cut it to 55–90 ms frames. At that size, building during the rise is fine; waiting for the rise to end made the glass a second late.
- **Stylesheets load asynchronously in shadow roots.** Insert copies before they load and you lay out everything twice: one 300 ms frame. Load them ahead of time, not at the open.
- **Any work under the quantity slider costs vibration ticks.** Run the `haptics-check` skill after every lens change.
- **Rewriting transforms every frame** keeps Safari repainting the band even at rest. Write only on change.
- **Inherited custom properties reach into shadow copies.** Changing `--rb` on every drag frame restyled all copies, causing 360–480 ms stalls. `@property --rb{inherits:false}` fixed it.
- **`root.querySelector(':scope > …')` never matches on a ShadowRoot**, so old copies piled up on every repaint. Track the copy by reference.
- **Fractional slice clips get rounded apart,** leaving a 1 px gap that showed the frost through the dim. Overlap each slice 1 px under the next.
- **A clear band over a frosted card is a grey bar.** Tint it to the frost and to Apple's 45% contrast.
- **Corner masks must fade the same way as the band,** or the copies' bottom edge shows as dashes at the sides.
- **Radial corners with page copies don't work.** Uniform-scale rings make stair-step streaks; wedges × rings needs about 100 copies. The faithful route would be an SVG `feDisplacementMap` on a single copy, if Safari draws it.
- **Don't paint a rainbow.** The colour comes from per-channel sampling of real content.

## 4. Re-measuring from a recording

**What to record:** an iPhone screen recording of clear (unfrosted) glass whose edge moves slowly back and forth over static, high-contrast text. The Notification Centre pulled part-way over a chat app works well.

**Tools:** `imageio_ffmpeg` (ffmpeg binary), numpy, scipy. Steps:

1. **Frames.** Stream raw frames and keep full-resolution crops of the useful range:
   ```python
   FF = imageio_ffmpeg.get_ffmpeg_exe()
   p = subprocess.Popen([FF,'-v','error','-i',V,'-map','0:v','-vsync','0','-f','rawvideo','-pix_fmt','rgb24','-'], stdout=subprocess.PIPE)
   a = np.frombuffer(p.stdout.read(W*H*3), np.uint8).reshape(H, W, 3)   # per frame
   ```
2. **Edge row per frame.** The sheet's interior and the outside differ in level. Take the 90th percentile of luminance per row over the middle columns and scan up from the bottom for the first sustained drop: `p90 < outside_level - 25` for 6 rows.
3. **Undistorted reference.** Use a frame from before the sheet arrives. Fit the app's recede on rows below the edge from 1-D row profiles: `y_ref = (y - c) / s` (here s 0.997, c 3.75), with gain and offset for the dimming.
4. **Row matching.** For each band row, find the reference row it shows: per channel, normalised cross-correlation of the row against reference rows interpolated on a 0.1 px grid, searching 160 px inwards. Keep `d_src = edge - y_src`, the NCC score, and the gain and offset (`lstsq` of the row on the matched reference row).
   ```python
   yy, xx = np.meshgrid((ygrid - c) / s, 585 + (xs - 585) / s, indexing='ij')
   U = map_coordinates(L, [yy, xx], order=1)                              # reference rows on a 0.1px grid
   Uc = U - U.mean(1, keepdims=True); Un = np.linalg.norm(Uc, axis=1)
   v = F[y, X0:X1, ch]; vc = v - v.mean()
   ncc = (Uc[lo:hi] @ vc) / (Un[lo:hi] * np.linalg.norm(vc)); k = argmax(ncc)
   ```
5. **Aggregate.** Take the median of `d_src` per integer `d` over frames with NCC ≥ 0.9 (≥ 0.8 for single channels near the rim). Subtract the baseline offset seen far inside (here −0.7 px). Fit `d + A(1 - d/B)^p` with `scipy.optimize.least_squares` on d ≥ 3 pt, and `C(1 - d/E)^q` to R−G and B−G.
6. **Haze and blur.** Haze is `1 - gain / interior_gain` per d. Test blur by Gaussian-blurring the matched source row horizontally (σ 0–8 px): if NCC drops, it isn't blur.
7. **Corners.** Fit a circle to the boundary points (inside means reference white and frame dark).
8. **Validate.** Re-render frames from the reference with the model: a signed-distance rounded rect, inward normal, per-channel `at()`, tint and haze. Compare crops with the real frames side by side.

## 5. Testing the implementation

Use Playwright with Chromium (`executablePath: '/opt/pw-browsers/chromium'`; never `playwright install`):
- **Viewport:** 390 × 844 or 390 × 665 (a browser with a bottom bar), DPR 3, `isMobile`, `hasTouch`, an iPhone user agent.
- **Network:** route every request through `route.fetch()` so the proxy's CA is used (never disable TLS).
- **Mock cart:** build `/cart.js` from `/products/<handle>.js`, empty and with one item.
- **Local files:** serve local `theme-r3.js`/`theme-r2.css` to test before pushing.

Checks:

| check | how | pass |
|---|---|---|
| Render | Screenshot the band, then simulate the exact lens in Python over a bare-page screenshot | mean diff ≈ 2/255 |
| Culling | Same band with `visit(src, 0)` commented out (full copies) | max diff ≤ 5 levels |
| Opening | CDP `Emulation.setCPUThrottlingRate` 4–6, `long-animation-frame` observer with script attribution | build frames ≲ 100 ms at 4× |
| Dragging | CDP `Input.dispatchTouchEvent` drag down and back | no long frames, gaps ≤ 33 ms at 4× |
| X and page | Real touch tap on the visible `[data-cart-open]` and on `.drawer__close`, then swipe the page | opens, closes, page scrolls |
| Edge cases | Close 120 ms after opening, reopen, toggle a class in main, 1280 px desktop | exactly one copy per root, repainted, no errors |
| Units | `node --check`, `node --test tests/quantity-haptics.test.mjs tests/cart-toolbar-rollback.test.mjs` | all pass |

Chromium can't show WebKit's compositing problems (the 37× hang never appeared there). Anything that changes layer structure needs the owner's iPhone.

## 6. Re-using it on another edge or element

- **Shape:** measure d along the inward normal of that edge, with the same `at()`. For an edge at the bottom of a top sheet, flip the axis: band row `edge - d` shows page `edge - at(d)`.
- **Size:** the profile is in absolute pt (31.4 pt band), not relative to the element. For something much smaller than ~80 pt, scale B (and the other constants) down together and check it still reads.
- **Material:** tint the band to match the element's material, and use the same contrast (~45%) for clear glass.
- **Budget:** about 10 copies; cull; build after the element's entrance animation; clip and contain every slice; write transforms only on movement; have a give-up path; stop on exit.
- **Sides and radial corners:** not done here. Each side needs its own set of horizontally stretched slices (about 10 more copies per side). Radial corners need per-pixel displacement (see section 3).
