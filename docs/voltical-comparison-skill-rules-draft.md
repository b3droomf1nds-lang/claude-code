# Candidate rules for the Voltical comparison-card design skill

This is the design-workflow layer. Permanent Shopify, Git, DOM, calculator, and editor safety belongs in root `AGENTS.md`, not in an optionally triggered skill.

The eventual `SKILL.md` should remain lean. These candidate rules will be refined against measured references and the regression cases before becoming the skill body.

1. **Start with a scope tuple.** Name the semantic card or section, viewport, requested properties, source-of-truth state, and explicit exclusions before editing.
2. **Default to Voltical Art Director.** Improve hierarchy and composition using Voltical facts and assets. Enter strict-reference behavior only when the user asks to match a supplied or identified reference exactly.
3. **Use evidence with provenance.** A borrowed value must record the source URL or user asset, capture date, viewport, visible element/selector, computed value or measured pixels, and screenshot. Do not borrow a hidden fallback as though it were the visible treatment.
4. **Separate observation from inference.** Label exact measured facts, inferred design principles, and original Voltical choices distinctly.
5. **Give each card one hero.** Establish one dominant number, phrase, or product image; arrange eyebrow, meaning, and qualification beneath that hierarchy instead of creating competing emphases.
6. **Preserve factual meaning.** Rephrasing may improve comprehension but cannot alter product claims, units, qualifiers, or calculated meaning without user approval.
7. **Match relationships, not isolated numbers.** Evaluate type-size ratios, line-height, spacing rhythm, optical centering, image crop, card proportion, and negative space as a system.
8. **Treat restraint as a decision.** Gradients, extra colours, badges, shadows, and decorative icons require a demonstrated hierarchy or product-communication purpose.
9. **Map impact before implementation.** Identify the winning cascade, inherited styles, structural/editor dependencies, calculated duplicates, and representative unaffected siblings.
10. **Apply tiny requests directly; stage redesigns.** A well-scoped property change can be implemented immediately. A composition or copy redesign should first state the proposed hierarchy and what will move, disappear, or be rephrased.
11. **Validate the rendered result, not the diff alone.** Use the deterministic harness, clean-state screenshots, computed-style assertions, and the relevant regression cases.
12. **Stop when the requested outcome is proven.** Do not opportunistically redesign adjacent cards, normalize unrelated CSS, or expand the viewport/product scope.

## Proposed supporting references

- `architecture.md`: current card map, CSS cascade zones, editor state, calculator hooks, and known coupling.
- `reference-evidence.md`: dated Apple/user-reference measurements with provenance; the current study is recorded in `docs/voltical-comparison-reference-evidence.md`.
- `design-system.md`: durable Voltical tokens plus generic design principles, clearly separated from Apple-specific observations.
- `regression-cases.md`: the project cases currently recorded in `docs/voltical-comparison-regression-cases.md`.
- `qa.md`: harness commands, viewport matrix, assertions, and unpublished-draft spot-check procedure.
