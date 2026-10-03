# Opt-in after-release haptic experiment

Draft only: `193289027910` on `imraiy-tv.myshopify.com`.

## Enable and disable

Open `/products/voltical-core-5k-10k?preview_theme_id=193289027910&qty_haptics=release-test`.
The parameter must remain in the URL. A small diagnostic panel appears only while the quantity menu is open. Normal URLs keep the existing selector, animation, and haptics. The runtime also requires the exact draft ID and `unpublished` theme role; it cannot activate on the live theme.

Removing `qty_haptics=release-test` and reloading disables the experiment without reverting any code or Claude's changes. No experiment state is saved to storage.

## What is attempted

- `Direct switch` calls the existing native switch's `.click()`.
- `Via label` calls an associated label's `.click()`.
- `Test after release` attempts one activation immediately in the real button click handler, then further activations at 150, 300, and 450 milliseconds.
- After a dragged slider is released, the selected quantity stays governed by the existing code. Separate requests follow each remaining rounded notch crossing of the actual animated knob position, in either direction.
- Several crossings in one animation frame are queued at least 16 milliseconds apart. Touching again, changing route, closing, hiding the page, or leaving cancels pending requests.
- Existing finger-down switch tracking, cart prices, quantity saves/removal, and pencil animations are not replaced.

The root's `data-haptic-attempts`, `data-haptic-last-attempt`, and bounded `data-haptic-attempt-log` attributes record **activation attempts only**, not motor feedback. They stay in the page and are not transmitted. A successful checkbox toggle, passing test, or desktop animation cannot establish that an iPhone vibrated.

## Physical iPhone test required

1. Open the test link in Safari, add one item if necessary, and tap its quantity pencil.
2. Leave the route on `Direct switch`. Tap `Test after release`, lift immediately, and check for separate delayed ticks while no finger touches the screen.
3. Change to `Via label` and repeat. Report either route's actual felt result, not just visible movement.
4. For any working route, flick the quantity slider across several stops and lift while the knob is still moving. Test both directions, repeated flicks, and touching again during settling.
5. Check closing to the pencil, quantity/price persistence, Remove, and a normal draft link with no test parameter.

Current WebKit source deliberately rejects untrusted synthetic switch and label activation for haptic feedback. The experiment is therefore expected to be silent on patched Safari; it is not a verified bypass. This test explores the physical behavior on the user's exact installed Safari without publishing or changing the normal path.

## Validation and rollback

Run `node --check theme-draft/assets/theme-r3.js` and `node --test tests/quantity-haptics.test.mjs`, plus Shopify Theme Check. After every scoped draft push, pull each pushed path into a fresh verification folder and compare against the working tree.

On 2026-10-03, syntax checking and all 23 selector tests passed. Installed Shopify Theme Check retained the pre-existing 23 errors and 8 warnings; the layout's existing syntax offense was confirmed in the untouched remote backup. The bundled skill validator could not start because its `@shopify/theme-check-common` dependency was missing.

All three uploaded paths were pulled back into `work/haptic-release-20261003/verified/` and matched byte-for-byte. A 390 × 844 Chrome preview confirmed the opt-in panel, both four-request probes, no console errors, quantity 5 saving across a reload, the absence of the panel on a normal URL, and Remove on the normal path. The originally empty cart was restored by removing only the temporary test item. This is not physical iPhone haptic verification; that result is still pending.

Exact pre-experiment draft copies are in `work/haptic-release-20261003/baseline/`. They must not be uploaded wholesale if another agent has since changed those files. For permanent removal, surgically delete the `qmReleaseTest` block and its guarded hooks in `assets/theme-r3.js`, the `hapticTest` translation mapping in `layout/theme.liquid`, and `cart.haptic_test` in `locales/en.default.json`, preserving all later unrelated edits. Never force-push or target the live theme.

Primary sources:

- [WebKit checkbox switch implementation](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp)
- [WebKit restriction of label haptics after script clicks](https://github.com/WebKit/WebKit/commit/4a8a90644cfc7a9a4b3cab13c4c0b49c53862787)
