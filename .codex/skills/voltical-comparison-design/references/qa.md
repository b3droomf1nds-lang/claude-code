# Comparison design QA

Read this before implementing or accepting a comparison-section change.

## Local gate

Run the current baseline before editing when practical:

```powershell
npm run test:compare
```

The harness renders the real snippets and CSS with deterministic placeholder
images. It checks source contracts, responsive card sets at 390/899/900/1440,
horizontal overflow, calculator duplicate synchronization, phrase-scoped
charge emphasis and canonical restore, Canva Refresh/Reset/Undo, and continuous
final touch movement.

After editing, run the same command. If a requested visual change causes an
expected screenshot failure:

1. inspect the expected, actual, and diff images;
2. verify the exact target, viewport, and unaffected control;
3. update baselines only after the new rendering is accepted;
4. rerun the normal suite.

```powershell
npm run test:compare:update
npm run test:compare
```

Never update snapshots merely to make a failure green. See
`docs/voltical-comparison-harness.md` for harness limitations and commands.

## Choose target-specific regression cases

Use `docs/voltical-comparison-regression-cases.md` as the detailed case source:

| Change type | Minimum cases |
| --- | --- |
| Phrase emphasis or caption typography | R01, R02, R03, R09 |
| Mobile-only style, size, or order | R02, R03, R04, R10 |
| Canva state, toolbar, text, gesture, Align, Reset, or Refresh | R05, R06, R08, R09 |
| Image/icon scale or crop | R03, R07, plus a real-image preview |
| Revert | R11 plus the original change's cases |
| Compact cards, DOM order, or calculator output | R06, R12 |

Add the relevant positive assertion and at least one unaffected sibling/control.
Do not run every interaction mechanically when the change cannot affect it, but
do not omit a coupled contract merely because the diff is small.

## State and viewport matrix

For responsive visual work, verify:

- 390px mobile;
- 899px mobile boundary;
- 900px desktop boundary;
- representative desktop, currently 1440px;
- no horizontal overflow and the intended visible order.

For editor-related work, test clean storage and the relevant persisted state:

- `volt-canva-layout-4` and `volt-canva-history-4` cleared;
- normal clean page outside edit mode;
- `edit=1` with the affected element/state;
- Refresh and Undo/Reset behavior as applicable;
- viewport crossing when state fields or Align are involved.

## Draft-preview supplement

The harness replaces remote product images with placeholders. It cannot prove
source-image pixels, transparent padding, the final crop, Shopify Liquid data,
or CDN behavior. For those, inspect the actual unpublished draft with clean
Canva storage and compare edit-off with edit-on state as needed.

Before any upload, follow root `AGENTS.md`: confirm the exact target is still the
unpublished draft, push only named files, and never use live/publish flags.

## Acceptance record

At handoff, state:

- exact target and viewport;
- requested outcome that was proven;
- representative unaffected sibling and viewport;
- tests and preview state used;
- whether screenshot baselines changed;
- any remaining limitation or intentional deviation.
