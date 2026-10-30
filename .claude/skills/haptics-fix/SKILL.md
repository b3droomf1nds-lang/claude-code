---
name: haptics-fix
description: >-
  Repair the bag's iPhone vibration (pencil tick, per-quantity ticks, fast
  first swipe) when the haptics-check skill fails or the owner reports the
  vibration has broken or weakened. Finds the change that broke it and undoes
  or reworks only that, without touching the parts that work.
---

# Haptics fix

Read the **haptics-check** skill first: it explains how the ticks work and
lists the fragile spots. Follow AGENTS.md for every theme push, commit and
branch rule.

## Rules

- **Work out the cause before changing anything.** The vibration code itself
  has rarely been the problem. The usual cause is something new near it: a tap
  highlight, an overlay over the bag, or main-thread work while the slider is
  up.
- **Do not retune the slider's motion, springs, `HAP` constants or the seed
  logic to "make it tick more".** The owner confirmed that code
  (`c8098d8`). Only change it if the diff proves it was changed since.
- **The seed's tap flash (`-webkit-tap-highlight-color`) stays at iOS's own
  40% strength.** `hapTint` gives it the colour behind the button, so no grey
  box shows (the owner's choice). Never make it fainter:
  - Fully transparent broke the pencil tick twice.
  - 1% (583c192) silenced the first swipe.

  If something else shows through as a box, fix the colour or corners, never
  the alpha.
- **Never fake ticks** with synthetic events, script-flipped switches, replay
  timers or extra test buttons. iOS ignores them, and earlier tries were
  removed.
- **Keep revert-style fixes surgical.** Revert only the hunk that broke it,
  never a whole file from an old commit, because other work lives in
  theme-r3.js.

## Steps

1. **Reproduce.** Run `node scripts/haptics-check.mjs` (and `--throttle 4`)
   plus the unit tests. Note exactly which checks fail.
2. **Bisect against known good.** For each suspect commit since `c8098d8` that
   touched `theme-r3.js` or `theme-r2.css` (`git log c8098d8.. -- theme-draft/assets/`):
   ```
   git show <commit>:theme-draft/assets/theme-r3.js > <scratch>/t.js
   node scripts/haptics-check.mjs --js <scratch>/t.js
   ```
   Note that `--js` swaps only the JS. If CSS is the suspect, edit the working
   copy temporarily. The first commit where a check fails is the cause.
3. **Match the failure to its usual cause:**

   | Failing check | Usual cause | Fix |
   |---|---|---|
   | Seed not over the bag, or something covers it | A new element above the header or bag button (z ≥ 119), a changed button size or position the seed's observers miss, or pointer-events | Lower or move the covering element. Keep `hapUpdateSeeds`'s `elementFromPoint` guard. |
   | Tap on the bag doesn't open the card, or the seed isn't primed | The touch or click guards in the drawer swallow the seed's events, or something calls `preventDefault` on the seed's touches | Exempt the seed (`iframe.qty-haptic-prime`) from the guard. Let its touches through untouched. |
   | Primed seed not over the slider, or touches miss it | `.qty-menu` or the drawer gained a layer above z 121, or the seed got parked (`hapReset` or `hapClearPrime` called in the open path) | Restore the z order. Find who clears the prime between the bag tap and the pencil. |
   | Fewer flips than stops, or moves not reaching the seed | `touchmove` handling changed, or the input is moved or resized by other code | Diff `hapTouchMove` / `hapPlace` against `c8098d8` and restore. |
   | Glass edge copies while the slider is up | New lens or repaint code ignores `qm` | Every lens step and repaint must wait while `qm` is set (`step()` and `changed()` in the `lensHalt` IIFE). |
   | Glass edge slow to appear | The build waits for the card's rise or for stylesheets again | Stylesheets are prepared at load (`prepare()`), and the copies start on open. See `docs/liquid-glass-lens.md`. |
   | Seed tap flash not at 40%, or not the colour behind the bag | Someone lowered the alpha to hide the box, or `hapTint` reads the wrong background | Restore 40%. Fix the colour lookup, never the alpha. |
   | All pass but the owner feels nothing on the first swipe | Something only real Safari shows. The tap flash was the cause twice; it is now held at 40% by a check. | Ask exactly what happens (no ticks, only the late ones, from the bag or from Add to bag), then look for anything new on the seed's tap path in Safari. |

4. **Fix only that, then prove it.**
   - Run the check on the fixed tree and on the broken version (`--js`): the
     fixed one passes, the broken one fails the same check.
   - If no check caught the problem, add one to `scripts/haptics-check.mjs`
     first.
   - Run the unit tests.
5. **Deploy per AGENTS.md.**
   - Verify the theme is unpublished.
   - Check that the deployed file equals git HEAD.
   - Do a file-scoped push with `--nodelete`.
   - Pull it back and diff.
   - Run `node scripts/haptics-check.mjs --deployed`.
   - Commit and push the branch.
6. **Tell the owner** what broke it and what you changed, and ask for the
   phone test from the haptics-check skill. Say that the browser checks pass
   but only their phone can confirm the ticks.
