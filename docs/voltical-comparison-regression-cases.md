# Voltical comparison-card regression cases

These cases are mined from failures and repeated corrections in the real project history. They are acceptance criteria for the future comparison-card design skill and its test harness. They are not a general web-design checklist.

Each case separates the user's semantic intent from the implementation assertion that proves the request was handled without collateral changes.

## R01 — Emphasize only the requested phrase

**Past request:** Make only `20% to 80%` bold in the charging-time caption.

**Observed failure:** The parent caption was styled, so surrounding words also became bold. Other attempts targeted the similarly worded partial-charge tile or guessed a new weight instead of matching the stated reference.

**Required behavior:** Identify the battery-icon charging-time card, wrap or target only the literal phrase, and reuse the measured/reference treatment. Preserve every surrounding text node and line break.

**Executable assertions:**

- The intended phrase has the requested computed weight, family, size, and colour.
- Preceding and following caption text retain their previous computed styles.
- The partial-charge card remains byte-for-byte or computed-style unchanged.
- Refresh, Canva restore, text edit, and Undo do not remove or widen the emphasis.

## R02 — Resolve semantic identity before selecting CSS

**Past request:** Change the tile “with the battery icon,” while several tiles contained `20% to 80%` copy or calculated values.

**Observed failure:** Text search alone selected the wrong tile.

**Required behavior:** Resolve a target tuple before editing: semantic card class, distinctive hook/media, viewport, requested property, and exclusions.

**Executable assertions:**

- The diff contains the intended semantic card selector.
- A sibling containing the same phrase/value remains unchanged.
- If identity is still ambiguous after DOM inspection, implementation pauses for clarification.

## R03 — Prevent selector spill

**Past requests:** Adjust one number, caption, image, colour, or tile height.

**Observed failure:** Broad `.pdp-cmp__stat`, `.pdp-cmp__sub`, or generic image rules altered sibling cards.

**Required behavior:** Use the narrowest semantic card and descendant selector that expresses the request. Record explicit unaffected siblings.

**Executable assertions:**

- Computed-style snapshots differ only for the intended target/property set.
- At least one same-kind sibling is compared before and after.
- No new unscoped generic compare rule is introduced for a one-card request.

## R04 — Keep mobile-only work out of desktop

**Past request:** Make several card/copy/height changes only on mobile.

**Observed failure:** Shared declarations changed desktop, or an earlier mobile declaration had no effect because a later compact-card cascade overrode it.

**Required behavior:** Inspect the final winning cascade, edit within `max-width:899px`, and preserve the `899/900` contract.

**Executable assertions:**

- The target changes at 390px and 899px.
- The target's relevant computed styles and rect are unchanged at 900px and desktop.
- There is no horizontal overflow or missing layout at either side of the breakpoint.

## R05 — Distinguish browser-local Canva state from deployed theme state

**Past symptom:** A change appeared in the embedded preview but not the external browser, or old changes appeared in one browser while a recovered image appeared in another.

**Observed failure:** `localStorage` layout/history created two visual realities; a browser-specific recovery was mistaken for a deployed theme change.

**Required behavior:** Identify whether the source of truth is authored theme code, generated bake CSS, or browser-local editor state. Never claim deployment from a storage-mutated preview alone.

**Executable assertions:**

- Test with clean `volt-canva-layout-4` and `volt-canva-history-4` state.
- Test `edit=0` after a normal reload.
- If persisted user layout must survive, test that exact state separately and label it as local.

## R06 — Preserve Undo, Reset, Refresh, and history as one contract

**Past requests:** Add Refresh, keep Undo working, make Reset clear or preserve specific data, and make Align process the correct set.

**Observed failure:** Toolbar changes could discard caption text, leave stale history, make a reset non-undoable, or affect only the current selection when the action was global.

**Required behavior:** Define the operation's target set and persistence semantics before coding. Capture multi-element operations as one history batch.

**Executable assertions:**

- Undo restores the complete immediately preceding state in one action.
- Reset one cannot change another element.
- Reset all and Align all affect exactly their documented target sets.
- Refresh commits active text editing and reloads both layout and history.

## R07 — Measure visible artwork, not transparent asset dimensions

**Past request:** Match the visible battery icon to an Apple reference and later enlarge it by 10%.

**Observed failure:** CSS width was reasoned from the transparent image canvas, while the visible green icon occupied only part of that canvas.

**Required behavior:** Measure the non-transparent pixel bounding box and compare the rendered visible bounds to the reference.

**Executable assertions:**

- Record source canvas dimensions and alpha bounding box.
- Compare visible icon width/height, not `<img>` element width/height.
- A requested percentage change applies to the visible artwork and does not alter sibling layout unexpectedly.

## R08 — Make touch gestures continuous and final

**Past request:** Make mobile dragging and resizing feel like Canva with no lag, threshold jump, drift, or post-lift motion.

**Observed failure:** A one-second inherited image transform transition, an 8px drag dead zone, unprojected scale factors, synchronous storage writes, and stale final touch samples produced trailing and jumps.

**Required behavior:** Disable transform transitions during touch editing, coalesce visual updates per animation frame, invert the full projected transform, start from the original touch point, and synchronously flush the last tracked sample at gesture end.

**Executable assertions:**

- The selected element's screen delta matches the finger delta within approximately 1px.
- Crossing the movement threshold produces no permanent offset or jump.
- The final rect is unchanged after two animation frames and 250ms.
- A stray additional finger cannot freeze or retarget the gesture.
- Desktop mouse handlers and deltas remain unchanged.

## R09 — Preserve canonical editable HTML across restore and history

**Past request:** Bold a phrase while retaining Canva text editing, line wrapping, Refresh, and Undo.

**Observed failure:** Legacy saved plain HTML overwrote newer Liquid spans; generated decoration could enter saved editor state and create phantom Undo steps; editing temporarily collapsed line wrapping.

**Required behavior:** Canonicalize authored text, current saved layout, saved history, and saved edits through one detached normalizer. Never rewrite the active contenteditable element while the caret is live.

**Executable assertions:**

- Clean refresh and restored layout produce the same canonical HTML.
- Entering and exiting text edit without changes adds no history entry.
- Explicit `<br>` structure and intended wrapping persist inside and outside edit mode.
- Undo cannot reintroduce a legacy or partially wrapped phrase.

## R10 — Change the winning layout rule, not a dead declaration

**Past symptom:** Repeated “make the tile longer” requests appeared to do nothing after Refresh.

**Observed failure:** Earlier height/aspect declarations were superseded by later mobile card rules, or a selector described a different card than the user meant.

**Required behavior:** Inspect computed styles and source-order winners before editing. Modify the final semantic rule rather than stacking another guess.

**Executable assertions:**

- The post-refresh rendered card rect changes by the requested amount.
- Dev/computed inspection identifies the new declaration as the winner.
- The paired/sibling card and desktop geometry remain unchanged unless included in the request.

## R11 — Revert only the requested change

**Past requests:** Revert an icon adjustment or a card redesign after other work had landed nearby.

**Observed failure risk:** Reverting an entire file or mixed commit can erase unrelated copy, responsive, or editor fixes.

**Required behavior:** Compare the target change with current HEAD, reverse only its owned hunk/property/markup, and preserve later adjacent work.

**Executable assertions:**

- The reverse diff contains only the named behavior.
- Unrelated changes made before or after it remain present.
- The reverted state is verified visually or behaviorally, not inferred from a commit message.

## R12 — Preserve duplicated calculator and structural contracts

**Past request:** Keep original tiles in place while adding smaller summaries, then hide selected originals on mobile.

**Observed failure risk:** Compact visible duplicates and hidden source cards share live values; deleting or reordering them can desynchronize calculations, break editor structural keys, or remove visible information from accessibility APIs.

**Required behavior:** Preserve all required duplicate hooks and structural positions, or perform an explicit migration with state-key handling and accessibility review.

**Executable assertions:**

- Every visible duplicate updates when device/capacity inputs change.
- No calculator guard fails when source cards are hidden.
- Existing Canva selections/history either remain valid or are deliberately migrated.
- Visible content is represented appropriately in the accessibility tree.

## How the future harness should use these cases

- Each case gets a fixture or state setup, an action, positive assertions, and at least one unaffected-control assertion.
- Screenshot comparisons supplement DOM/computed assertions; they do not replace them.
- Local deterministic tests run before any Shopify upload. A real unpublished-draft spot check covers Shopify-specific rendering afterward.
- A skill revision is accepted only when it improves these cases without weakening project invariants.
