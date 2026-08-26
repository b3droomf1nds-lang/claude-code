# Voltical comparison regression harness

This local-only harness renders the real comparison and Canva-editor snippets
against the real theme CSS. It never connects to Shopify and cannot publish or
modify a theme.

## Run it

```powershell
npm run test:compare
```

When an intentional visual change is approved, regenerate the committed image
baselines, inspect their diff, then rerun the normal suite:

```powershell
npm run test:compare:update
npm run test:compare
```

The harness uses the installed Google Chrome via Playwright. It does not
download its own browser. Generated reports, traces, and failure screenshots go
under `test-results/` and are ignored by git.

## What it checks

- the nine-card structural order and the compare-before-editor render order;
- the shared 899/900 breakpoint, generated Canva block, and editor storage keys;
- mobile and desktop visible card sets at 390, 899, 900, and 1440 pixels;
- horizontal overflow and pixel baselines for the comparison block;
- calculator synchronization across source and compact duplicate values;
- persisted Canva Refresh, Reset all, and Undo behavior;
- real touch movement before the old four-pixel threshold, exact lift position,
  and no post-lift drift.

Remote Shopify images are replaced with a deterministic local SVG only inside
the harness. This keeps visual diffs stable and prevents the test from depending
on network or CDN state. The screenshots therefore validate layout, typography,
visibility, and cropping containers—not the product image pixels themselves.

At desktop widths, `?frame=1` neutralizes the section's page-level translation
and scaling and hides the off-grid heading/select group so the six-card grid fits
in a deterministic capture. Mobile captures retain the complete heading, select,
and cards. The source-contract tests still assert the real desktop transform and
breakpoint rules remain present in the theme CSS.
