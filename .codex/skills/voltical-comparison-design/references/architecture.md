# Comparison-section architecture

Read this before changing comparison Liquid, CSS, calculator behavior, Canva
behavior, card structure, or responsive composition. Root `AGENTS.md` remains
the safety and invariant authority.

## Source map

- `theme-draft/snippets/pdp-compare-inline.liquid`: authored card DOM, copy,
  media, device selector, calculator data, and calculator script.
- `theme-draft/assets/voltical-pdp-bold.css`: comparison visual system,
  responsive order and visibility, generated Canva bake, and the final mobile
  tall/compact-card cascade.
- `theme-draft/snippets/pdp-canva-editor.liquid`: editor restore, selection,
  move/resize/text gestures, Align, Undo, Reset, Refresh, history, and export.
- `theme-draft/sections/main-product.liquid`: renders the comparison immediately
  before the editor inside `.pinfo__below[data-reveal]`.
- `theme-draft/assets/theme-r2.css`: base tokens and the global reveal image
  transform transition that the editor disables while active.

## Structural card map

The nine direct `.pdp-cmp__grid` children are structural keys:

| Index | Semantic identity | Distinctive marker |
| ---: | --- | --- |
| 1 | magnet image card | `.pdp-cmp__card--magnet` |
| 2 | charge-time/battery card | `.pdp-cmp__card--charge`, `data-calc-time` |
| 3 | full-charges source card | `.pdp-cmp__img--full-upright`, `data-calc-full-num` |
| 4 | reversible/alloy image card | `.pdp-cmp__card--video` |
| 5 | partial-charge image card | `.pdp-cmp__card--partial-image`, `data-calc-partial-num` |
| 6 | video-hours source card | `.pdp-cmp__card--fade`, `data-calc-video` |
| 7 | compact video summary | `.pdp-cmp__card--compact-video` |
| 8 | compact partial summary | `.pdp-cmp__card--compact-partial` |
| 9 | compact full summary | `.pdp-cmp__card--compact-full` |

Desktop shows the six source cards. Their baked visual order is video, fade,
partial-image, then magnet, charge, full. Mobile hides source cards 3, 5, and 6;
its visible order is video, magnet, charge, compact video/partial side by side,
then compact full across both columns.

Do not insert, remove, reorder, or wrap structural children casually. Canva
paths and generated selectors use `:nth-child` ancestry. A structural migration
requires deliberate state/history migration or key bump, re-bake, and expanded
QA.

## Render and state layers

Reason about the rendered result in this order:

1. authored Liquid structure and copy;
2. base/reveal CSS from `theme-r2.css`;
3. authored comparison rules in `voltical-pdp-bold.css`;
4. generated declarations between `CANVA-BAKED-START` and
   `CANVA-BAKED-END`;
5. later mobile tall-card and compact-card rules, which intentionally override
   earlier declarations;
6. editor runtime transforms and text restored from `volt-canva-layout-4` and
   `volt-canva-history-4`.

The desktop geometry is coupled: `.pdp-cmp-wrap` translates the section,
`.pdp-cmp` scales by `3`, and `.pdp-cmp__grid` scales by `1.449`. Baked slot
moves assume the existing raw card geometry and gap. Change those values only
as a coordinated layout migration.

Mobile child transforms project desktop-local units to mobile card width. Whole
card cell moves remain desktop-only. The final mobile blocks—not the earlier
single-column declarations—own current fixed/tall card dimensions and the
compact two-column tail.

## Calculator and editor coupling

- Source and compact cards intentionally duplicate calculated outputs. The
  calculator writes with `querySelectorAll`; preserve every required hook and
  verify all copies update together.
- The charge-time caption has a canonical HTML normalizer in the editor. It
  unwraps legacy emphasis spans and wraps only visible `20% to 80%`. Any change
  to this copy model must cover authored baseline, current layout, saved history,
  text saving, active caret safety, Refresh, and Undo.
- Editor state is `{dx, dy, s, axd, ayd, axm, aym, text}`. Align corrections are
  viewport-specific while manual offsets are shared. Preserve transform order,
  batching, persistence, and the final touch sample.
- The magnet `<picture>` wrapper and inner `<img>` are a known crop/transform
  hazard because historical baked selectors and editor registration can target
  different levels. Inspect both computed matrices before changing that media.

## Known boundaries

- The compact summaries are visible on mobile but currently `aria-hidden`; the
  hidden source cards carry the accessible duplicates. Treat any accessibility
  correction as an explicit structural/accessibility task, not a side effect of
  a visual tweak.
- Mobile full bleed mirrors the theme `.wrap` padding with negative margins.
  Coordinate any page-padding change with that rule.
- `.template-product` reaches every product template. A Core-only request needs
  a Core or semantic-card scope, not merely the generic template class.
