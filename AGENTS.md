# Voltical repository rules

These rules apply to every task in this repository, whether or not a design skill is invoked. `AGENTS.md` is the canonical project-safety source; tool-specific instruction files should point here rather than duplicate it.

## Shopify and Git safety

- The only editable Shopify target is the unpublished draft theme `193289027910`, named `Claud and codex theme`, on `imraiy-tv.myshopify.com`.
- Never modify, publish, or push to the live theme. Never use `--live`, `--publish`, or `--allow-live`.
- Theme source is `theme-draft/`. The separate `theme/` tree is out of scope and must not be edited.
- Work on branch `claude/shopify-cli-setup-5ih4po`. Inspect the branch and working tree before editing; preserve unrelated user changes.
- Push only explicitly changed theme-relative files, from `theme-draft/`, with:
  `shopify theme push --store imraiy-tv.myshopify.com --theme 193289027910 --only <file> --path .`
- Before a theme upload, verify that theme `193289027910` is still unpublished. Do not perform a bulk theme push when a file-scoped push can complete the request.
- Commit the completed, verified change to the required branch and push that branch to GitHub. Never commit credentials or Theme Access passwords.

## Core comparison-section invariants

- Treat `theme-draft/snippets/pdp-compare-inline.liquid`, `theme-draft/assets/voltical-pdp-bold.css`, and `theme-draft/snippets/pdp-canva-editor.liquid` as a coupled system.
- Preserve the order and wrapper depth of `.pdp-cmp` and `.pdp-cmp__grid` children unless the task explicitly includes a structural migration. Canva state, history, export selectors, generated bake selectors, desktop slots, and mobile order use structural `:nth-child` paths.
- Preserve the single responsive boundary: mobile ends at `899px`; desktop begins at `900px`. Do not create a gap or overlap between CSS, JavaScript media queries, and `<picture>` sources.
- Preserve every live calculator hook and duplicate writer, including `data-calc-time`, `data-calc-full`, `data-calc-full-num`, `data-calc-partial`, `data-calc-partial-num`, `data-calc-video`, and `data-calc-video-num`, unless the task explicitly includes calculator migration and regression coverage.
- Never hand-edit content between `CANVA-BAKED-START` and `CANVA-BAKED-END`. It is generated layout output.
- Treat `volt-canva-layout-4` and `volt-canva-history-4` as persisted user data. Changes to the state schema, structural keys, reset behavior, normalization, or bake contract require an intentional migration or key bump plus editor regression tests.
- The existing `.claude/skills/canva/SKILL.md` is historical and stale. Use the live Liquid, CSS, and JavaScript as behavioral truth.
- For a Core-only request, do not assume `.template-product` is sufficiently scoped: it reaches every product template. Scope new rules through the Core section or a semantic Core-card class when possible.

## Change isolation

- Identify the target by semantic card class, distinctive media/hook, viewport, and requested property before editing. Similar visible copy is not enough; multiple cards contain `20% to 80%` and repeated calculated values.
- Use the narrowest selector that expresses that identity. Avoid broad edits to `.pdp-cmp__stat`, `.pdp-cmp__sub`, generic images, or all cards when one tile or phrase is requested.
- For mobile-only work, edit inside the final applicable `max-width:899px` cascade and prove the desktop computed result is unchanged. Earlier declarations may be dead because later compact-card rules win.
- Do not infer visible artwork size from an image element's box when the asset has transparent padding. Measure the non-transparent pixel bounds.
- A revert must be surgical: inspect the current diff and preserve unrelated work that landed before or after the change being reversed.

## Verification before handoff

- Verify the exact requested target and a representative unaffected sibling.
- Check a clean preview outside Canva mode as well as edit mode. Local Canva storage can make one browser differ from the deployed draft.
- For responsive compare changes, check mobile, `899px`, `900px`, and desktop; check horizontal overflow and visible ordering.
- For calculator/editor changes, verify live value synchronization, selection, drag/resize, text editing, Undo, Reset, Refresh, persisted history, and viewport crossing as relevant to the change.
- Treat existing unrelated Theme Check failures as baseline; do not introduce a new offense in a changed file or use a strict bulk push that is blocked by unrelated errors.
