# Voltical comparison skill replay

This is the Step 6 behavioral evaluation of
`.codex/skills/voltical-comparison-design`. It replays actual requests and
observed failures from this repository rather than grading the skill on writing
style or generic design advice.

## Method

For each historical request, compare four things:

1. the user's semantic target;
2. the wrong turn visible in repository history;
3. the decision the skill and always-on `AGENTS.md` require;
4. an observable assertion in the harness or a named draft-only supplement.

A case passes only when the workflow selects the correct target and viewport,
prevents the known collateral change, and names a way to verify the result. A
rule that merely sounds relevant is not sufficient.

This is a deterministic same-agent replay. It does not claim the additional
independence of a blind delegated evaluation.

## Results

| Case | Historical evidence | Required skill decision | Verification | Verdict |
| --- | --- | --- | --- | --- |
| Only `20% to 80%` should match `Strong magnet.` | `d1b412e` styled the whole caption; `959c252` targeted the partial-charge card; `9a38526` reached the battery card but guessed a separate weight | Resolve `.pdp-cmp__card--charge` through its battery/time hook, wrap only the literal phrase, inspect the magnet lead as the strict local reference, and preserve the canonical editor HTML path | New Playwright case compares the lead treatment, proves the surrounding caption remains different, proves the partial card has no lead wrapper, migrates legacy saved text, and rejects a phantom no-op edit history entry | Pass |
| Make one mobile tile longer | `c3eed97` changed an earlier aspect ratio that lost to the later fixed-height cascade; later commits moved the override and corrected which visual tile “top” meant | Resolve semantic class rather than visual ordinal, record the current rendered rect, change the final `max-width:899px` winner, and keep 900px/desktop unchanged | Responsive screenshots and card-set/overflow checks at 390, 899, 900, and 1440; target rect/computed winner remains a required task-specific assertion | Pass |
| Reset/Refresh must keep Undo coherent | Reset behavior changed around `9429097`; the risk was treating text, transforms, persisted history, and multi-element actions as separate concerns | Route to editor architecture and R06; define the exact Reset target set and whether text is included before coding; capture the operation as one batch and commit active text before Refresh | Playwright resets persisted state, reloads with Refresh, and restores the entire prior state with one Undo | Pass |
| Match and then enlarge the compact battery icon | `33247ed` enlarged the image box directly; `ab81d88` reasoned from card proportion; `d9fee0a` finally compensated for the asset's approximately 62% visible content | Measure the non-transparent artwork bounds, not the `<img>` rectangle, and apply the requested percentage to visible pixels | Skill rule 8 and R07 force canvas/alpha measurements plus a real-image preview; the local harness deliberately cannot certify remote image pixels | Pass with required draft/image supplement |
| Remove mobile touch threshold jump and post-lift drift | The editor inherited a one-second image transition and had dead-zone/final-sample problems; `231f2f4` addressed the remaining selected-drag threshold | Route Canva interaction work to architecture/R08; preserve the mouse path and verify finger-to-screen delta plus final settled position | Touch Playwright test proves preview at a two-pixel move, approximately 1:1 final delta, and no movement after lift | Pass |
| “Make it Apple-like” gradient versus “copy this exact Apple component” | `51c4f63` and `c09e244` introduced original gradients while describing the result as Apple-like; later inspection proved the measured iPhone Air and iPhone 17 treatments differ | Use Art Director behavior for a directional mood and label the gradient as a Voltical choice; use strict mode only for an identified component with dated, visible computed evidence; never promote one gradient to a universal Apple rule | `docs/voltical-comparison-reference-evidence.md` records source, viewport, visibility, geometry, type, and two different measured treatments | Pass |
| “Revert that last change” after nearby work landed | Repeated icon and layout reversions made whole-file rollback unsafe | Invoke the comparison skill for a contextual fix/revert, inspect the owned hunk against current HEAD, and reverse only that behavior while retaining adjacent work | R11 and `AGENTS.md` require a surgical reverse diff and verification of an unaffected control | Pass after trigger correction |

## Mode-routing replay

The single skill with a strict toggle handled the real prompt shapes more
cleanly than two separate ceremonial skills:

- “Make this exact same style/size as that supplied tile” selects strict
  reference matching for the named relationship.
- “Come up with a better layout, more Apple-like” selects Voltical Art Director
  and preserves Voltical facts/assets.
- “Make it 10% bigger,” “fix the drag,” and “revert that” are direct scoped
  operations; they do not require a redesign preamble.

## Gap found and corrected

The original discovery description covered design, resizing, review, and
Canva-mode behavior, but did not explicitly name the terse `fix`, `debug`, or
`revert` prompts that recur in this project. Since a skill is selected anew on
later turns, that was a real under-trigger risk. Step 6 adds those verbs to the
description without widening the skill beyond the Voltical comparison section.

No new design rule was added. The twelve working rules already changed the
decision for every replay case; adding example-specific rules would make the
skill longer without improving these outcomes.

## Remaining honest limitation

The skill has not received a blind forward test by an independent agent. Its
code and rendering assertions are deterministic, but the decision replay was
performed in the same task that created the skill. A future independent test
should receive only the skill, raw repository, and realistic prompt—not this
report or the expected answer.
