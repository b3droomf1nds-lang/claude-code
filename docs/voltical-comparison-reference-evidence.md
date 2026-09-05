# Voltical comparison-card reference evidence

This document records observed source facts for the future comparison-card design skill. It deliberately separates exact measurements from interpretation. Live reference pages are evidence sources, not runtime dependencies; re-measure before claiming that a current Apple page still uses these values.

## Inspection method and provenance

- Capture date: 2026-08-26.
- Browser: connected Chrome, inspected through the rendered DOM and `getComputedStyle`.
- Primary source: [Apple Ireland — iPhone Air](https://www.apple.com/ie/iphone-air/), visible `Worth the upgrade? Absolutely.` comparison section, selected `iPhone 14 Pro` comparison option.
- Variation source: [Apple Ireland — iPhone 17](https://www.apple.com/ie/iphone-17/), visible `Worth the upgrade? See for yourself.` comparison section, selected `iPhone 13` comparison option.
- Supporting source inspected but excluded from compact-card tokens: [Apple Ireland — Apple Watch Series 11](https://www.apple.com/ie/apple-watch-series-11/). Its battery narrative uses a different carousel/control component, so its values should not be mixed into the compact comparison-card system.
- Mobile browser override: `390 × 844`; rendered document client width was `375px` because Chrome reserved a `15px` scrollbar gutter. Device-pixel ratio was approximately `1`.
- Desktop browser override: `1440 × 900`; rendered document client width was `1425px` for the same reason.
- Visibility rule: measurements came from the active comparison option with `aria-hidden="false"` and a non-zero rendered rect. Hidden fallback elements were excluded.

The browser inspection also visually confirmed the rendered mobile grid. Third-party page screenshots are not committed to this repository; the source URL, capture date, viewport, active option, selector/class, rendered rect, and computed styles are the durable evidence record.

## iPhone Air compact comparison system

### Grid and card geometry

| Property | Mobile | Desktop |
| --- | ---: | ---: |
| Grid class | `.compare-tile-wrap` | `.compare-tile-wrap` |
| Grid rendered size | `326.240 × 592px` | `1037.490 × 620px` |
| Columns | `159.115px 159.125px` | `338px 329.740px 329.750px` |
| Rows | `192px 192px 192px` | `300px 300px` |
| Row/column gap | `8px` | `20px` |
| Stat card rendered size | `159.125 × 192px` | `329.740 × 300px` |
| Card background | `#FFFFFF` | `#FFFFFF` |
| Card radius | `12px` | `28px` |
| Card overflow | `clip` | `clip` |
| Section background | `#F5F5F7` | `#F5F5F7` |

Observed proportions:

- Mobile stat-card width/height ratio: approximately `0.829`.
- Mobile gap/grid-width ratio: approximately `2.45%`.
- Mobile grid inset from the `375px` document edge: approximately `23.417px`, or `6.24%`.
- Desktop cards are wider relative to their height; Apple changes the composition instead of uniformly scaling the mobile card.
- The stat content group occupied `115px` of the `192px` mobile card and `174px` of the `300px` desktop card. Both cards used flex centering rather than fixed top coordinates.

### Stat hierarchy

Active markup in the graphics card:

```html
<p class="ps-stat ps-stat-reduced">
  <span class="ps-stat-copy">Up to</span>
  <span class="gradient-text">70% <br>faster</span>
  <span class="ps-stat-copy">GPU performance</span>
</p>
```

| Role | Mobile | Desktop |
| --- | --- | --- |
| Eyebrow | SF Pro Text, `14px/18px`, weight `400`, tracking `-0.224px`, `4px` bottom margin | SF Pro Text, `17px/21px`, weight `400`, tracking `-0.374px`, `12px` bottom margin |
| Hero | SF Pro Display, `28px/32px`, weight `500`, tracking `0.196px`, two lines | SF Pro Display, `48px/52.008px`, weight `500`, tracking `-0.144px`, two lines |
| Descriptor | SF Pro Text, `14px/18px`, weight `400`, tracking `-0.224px`, `4px` top margin | SF Pro Text, `17px/21px`, weight `400`, tracking `-0.374px`, `12px` top margin |
| Supporting colour | `#606F7F` on the inspected iPhone Air stat card | `#606F7F` |

Visible hero treatment at both viewports:

```css
background-image: linear-gradient(
  0deg,
  rgb(122, 143, 164),
  rgb(29, 29, 31) 50%
);
background-clip: text;
```

Equivalent stops: `#7A8FA4` into `#1D1D1F` at `50%`.

Important visibility finding: the page also contained a hidden `70% faster` fallback using SF Pro Text at `17px`, weight `500`, and solid `#1D1D1F`. It was not the visible mobile card. A reference workflow that searched text without checking visibility could copy the wrong element.

### Section hierarchy and controls

| Element | Mobile | Desktop |
| --- | --- | --- |
| Section headline | SF Pro Display `32px/36px`, weight `400`, tracking `0.128px`, same navy-to-ink gradient | SF Pro Display `40px/44px`, weight `400`, normal tracking, same gradient |
| Select label | SF Pro Text `14px/18px`, weight `400`, `#6E6E73` | SF Pro Text `17px/21px`, weight `400`, `#6E6E73` |
| Select control | `326.240 × 36px`, radius `26px`, SF Pro Text `14px/20px`, weight `500`, horizontal padding `22px/42px` | `306 × 50px`, radius `26px`, SF Pro Text `17px/21px`, weight `500`, same horizontal padding |
| Intro copy | SF Pro Text `17px/21px`, weight `400`, `#6E6E73` | SF Pro Display `21px/25px`, weight `400`, `#6E6E73` |

Measured mobile vertical rhythm:

- Headline to select label: `32px`.
- Label to select control: `16px`.
- Select control to intro: `32px`.
- Intro to active grid: `24px`.

### Image-led card

Mobile `.compare-tile-design`:

- Card: `159.115 × 192px`, `12px` radius, `overflow: clip`, `20px` top padding.
- Copy: SF Pro Text `14px/18px`, weight `400`, colour `#6E6E73`, horizontal padding `12px`, rendered height `54px`.
- Image wrapper: `143.115 × 118px`, begins exactly below the copy group and ends flush with the card bottom.
- Figure: `background-size: contain`, `background-position: 100% 50%`.

Desktop `.compare-tile-design`:

- Card: `338 × 300px`, `28px` radius, `32px` top padding.
- Copy: SF Pro Text `17px/21px`, weight `400`, colour `#6E6E73`, horizontal padding `32px`, rendered height `42px`.

The source does not apply a single percentage scale to the mobile card. It increases card width, changes aspect ratio, expands radius/padding/gap, and promotes the type scale independently.

### Battery icon treatment

In the compact battery-stat card, Apple rendered its small battery artwork as an absolutely positioned `30 × 16px` background image beside the word `hours`. The surrounding hero text retained the same gradient and type treatment as the graphics card.

This measurement concerns the visible rendered artwork, not a transparent source canvas. It supports regression case R07: icon matching must compare visible pixel bounds.

## iPhone 17 variation: same geometry, different art direction

The iPhone 17 mobile comparison used the same structural card system:

- `326.240px` grid width.
- Two columns of approximately `159.12px`.
- Three `192px` rows.
- `8px` gaps.
- White cards with `12px` radius and clipped overflow.

However, its stat treatment was intentionally different.

Active graphics-card markup used `.gradient-wrapper` rather than the iPhone Air page's `.gradient-text`. Computed mobile treatment:

```css
background-image: linear-gradient(
  90deg,
  rgb(169, 119, 200),
  rgb(111, 140, 199) 17%,
  rgb(99, 154, 71) 33%,
  rgb(29, 29, 31) 50.01%,
  rgb(29, 29, 31)
);
background-clip: text;
color: transparent;
```

Equivalent colour sequence: `#A977C8`, `#6F8CC7`, `#639A47`, then `#1D1D1F`.

Its hierarchy was also heavier:

- Eyebrow and descriptor: SF Pro Text `14px/18px`, weight `600`, colour `#6E6E73`.
- Hero: SF Pro Display `28px/32px`, weight `600`, tracking `0.196px`.
- Image-card copy: SF Pro Text `14px/18px`, weight `600`, colour `#6E6E73`, `16px` horizontal padding and `16px` card-top padding.

Therefore neither “Apple uses a navy fade” nor “Apple uses weight 500” is a universal rule. Those are page/component observations. Strict-reference work must use the chosen component's values; default Voltical art direction should borrow relationships only when a direct match is not requested.

## Durable principles inferred from the evidence

These are interpretations, not copied computed values.

### Generic design and engineering principles

- Use one clear hero per compact card, surrounded by subordinate context and meaning.
- Keep sibling cards geometrically consistent even when their content types differ.
- Change compositions responsively; do not scale every mobile measurement by one factor.
- Use clipped media intentionally and terminate it at a deliberate card edge.
- Verify visibility and the winning rendered style before treating a DOM match as reference evidence.
- Preserve negative space as part of hierarchy rather than filling every available area.

### Apple-specific observations

- The inspected comparison systems use SF Pro Text for supporting roles and SF Pro Display for large hero statistics.
- The compact mobile system uses white `159 × 192px` cards on `#F5F5F7`, `12px` radii, and `8px` gaps at the inspected width.
- The corresponding desktop system uses roughly `330 × 300px` cards, `28px` radii, and `20px` gaps.
- Supporting text commonly uses `#6E6E73`; iPhone Air's stat-card supporting colour was `#606F7F`.
- Gradient choice and font weight vary by product art direction even when the geometry is shared.

## Rules this evidence should produce in the skill

- Record source, capture date, viewport, active/visible selector, rendered rect, and computed property for borrowed treatments.
- In strict-reference mode, match one selected component; do not combine typography from one Apple page with colour from another.
- In default Art Director behavior, begin with the measured relationships and Voltical facts/assets, then document original choices.
- Never describe a live Apple page as a permanent rule. Store the extracted evidence and revalidate only when currency matters.
- Reject hidden fallback styles and zero-size nodes as visual references.
- Keep exact source facts separate from inferred principles and Voltical-specific decisions.
