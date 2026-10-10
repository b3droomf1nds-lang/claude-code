# Strict reference matching

Use this mode only when the user asks to match a specific supplied or identified
component exactly. The binding reference is that component—not a generalized
idea of Apple styling and not a mixture of several pages.

## Evidence gate

Before borrowing a value, record:

- source URL or attached/local asset;
- inspection date and viewport;
- active, visible element or selector;
- rendered rectangle or visible-pixel bounds;
- relevant computed properties;
- whether the value is an exact observation, an inference, or an original
  Voltical adaptation.

Reject hidden fallbacks, `aria-hidden` alternatives, zero-size nodes, and DOM
matches that are not the rendered reference. If currency matters for a live page,
reinspect it rather than treating stored measurements as permanent.

Existing measured evidence is in
`docs/voltical-comparison-reference-evidence.md`. Read the relevant component
section rather than importing the entire reference study into every task.

## Match the component as a system

Measure and reproduce the requested relationships together:

- card width, height/aspect, radius, overflow, grid columns, and gaps;
- hero/supporting typefaces, sizes, weights, line heights, and tracking;
- content-group height, internal spacing, optical centring, and negative space;
- image crop, focal point, visible artwork bounds, and card-edge termination;
- responsive recomposition rather than a single global scale factor.

Use Voltical product facts and authorized Voltical assets. Do not copy Apple
marketing text, trademarks, or product artwork merely because the geometry is a
reference.

## Guard against invented “Apple rules”

The dated evidence proves that the visible iPhone Air comparison hero used the
`#7A8FA4` to `#1D1D1F` gradient at the inspected time. That value was measured,
but it is not universal: the inspected iPhone 17 component used a different
multi-colour gradient and heavier typography while retaining similar compact
card geometry.

Therefore:

- reuse an exact gradient or weight only when the user selected that measured
  component as the strict reference;
- never combine geometry from one page with colour/type from another without
  explicitly documenting the adaptation;
- if the requested trait cannot be inspected or measured, state the uncertainty
  and choose a clearly labelled Voltical decision instead of fabricating a
  computed value.

## Acceptance

Compare the rendered target and reference at the same viewport. Report material
deviations and why they remain—for example, different copy length, a Voltical
asset crop, or an accessibility constraint. Verify an unaffected sibling and the
unrequested viewport before accepting the match.
