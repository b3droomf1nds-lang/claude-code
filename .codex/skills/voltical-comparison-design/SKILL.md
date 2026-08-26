---
name: voltical-comparison-design
description: Design, restyle, resize, recompose, or review the Voltical Core comparison cards and their Canva-mode behavior in theme-draft. Use for requests about comparison tiles, tile copy, statistics, images or icons, crops, spacing, mobile or desktop layout, Apple-reference matching, or comparison-section visual QA; do not use for unrelated product-page components.
---

# Voltical comparison design

Read the repository root `AGENTS.md` before inspecting or changing code. It is
the authority for Shopify safety, Git scope, structural invariants, and upload
rules. This skill supplies the design and verification workflow; it does not
replace or repeat those always-on rules.

## Resolve the request

Before editing, establish a scope tuple:

- semantic card or section target, confirmed by class plus a distinctive hook,
  media element, or surrounding structure;
- viewport: mobile, desktop, or both;
- requested properties: copy, hierarchy, geometry, crop, artwork, interaction,
  or a named subset;
- source of truth: authored Liquid/CSS, generated Canva bake, or browser-local
  Canva state;
- explicit exclusions and at least one representative unaffected sibling.

Inspect when these facts are discoverable. Ask only when the unresolved choice
would materially change the result.

## Choose the design behavior

Default to **Voltical Art Director**: preserve Voltical facts and assets while
improving hierarchy and composition. Read
[references/art-direction.md](references/art-direction.md) for layout, copy, or
open-ended “make it better / more Apple-like” work.

Use **strict reference matching** only when the user asks for an exact or same
match to a supplied or identified component. Read
[references/strict-reference.md](references/strict-reference.md). A reference
image used as inspiration does not by itself make every measured value binding.

For any code change, read
[references/architecture.md](references/architecture.md). Before implementing
or accepting a visual change, read [references/qa.md](references/qa.md) and map
the request to the relevant cases in
`docs/voltical-comparison-regression-cases.md`.

## Working rules

1. Target by semantic identity, not repeated visible wording. Similar statistics
   and `20% to 80%` copy occur in multiple cards.
2. Use the narrowest card-and-descendant selector that expresses the request.
   Never solve a one-card request with a global `.pdp-cmp__stat`,
   `.pdp-cmp__sub`, card, or image rule.
3. Inspect the winning cascade and computed result before changing CSS. Modify
   the final applicable rule instead of stacking a declaration above a later
   override.
4. Give each card one visual hero. Eyebrow, meaning, qualifier, and artwork must
   support that hero rather than compete with it.
5. Judge relationships as a system: type ratios, line height, optical centring,
   spacing rhythm, crop, card proportion, and negative space—not isolated font
   sizes or coordinates.
6. Preserve product facts, units, qualifiers, calculated meaning, and visible
   duplicate values. Rephrase only when meaning remains exact or the user
   approves a claim change.
7. Treat gradients, extra colours, shadows, badges, and icons as purposeful
   hierarchy tools. Do not add decoration merely to imitate a brand mood.
8. Measure visible artwork bounds when an asset has transparent padding. The
   `<img>` box is not evidence of the visible icon or product size.
9. Treat mobile and desktop as related compositions, not uniformly scaled
   copies. Prove the unrequested viewport remains unchanged.
10. Implement a small, explicit request directly. For a true redesign, first
    state the proposed hero, supporting roles, responsive composition, and what
    will move, disappear, or be rephrased.
11. Keep observations, inferred principles, and original Voltical decisions
    separate. Never present an unmeasured value as an inspected Apple rule.
12. Stop when the scoped outcome and unaffected control are proven. Do not
    opportunistically redesign siblings or normalize adjacent CSS.

## Completion

Run the deterministic harness and the target-specific checks in the QA
reference. Inspect screenshot changes rather than automatically accepting new
baselines. For image pixels, transparent bounds, or Shopify-specific rendering,
supplement the placeholder-based harness with the unpublished draft preview.

Follow `AGENTS.md` for the exact draft-only upload, commit, and GitHub push
workflow. Never infer permission to touch the live theme.
