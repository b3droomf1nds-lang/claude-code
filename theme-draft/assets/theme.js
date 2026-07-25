/* ============================================================
   VOLTICAL — theme.js
   No dependencies. Modules: util, reveal, header, gallery,
   variants, add-to-cart, calculator, collection filters,
   cart drawer (+ shipping protection).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- util ---------- */
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const money = (cents) => {
    const fmt = (window.Voltical && window.Voltical.moneyFormat) || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    return fmt.replace(/\{\{\s*amount[^}]*\}\}/, amount).replace(/<[^>]+>/g, '');
  };
  const fetchJSON = (url, opts) =>
    fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

  /* ---------- reveal on scroll + charge lines ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  $$('[data-reveal]').forEach((el) => io.observe(el));

  /* ---------- header / mobile nav ---------- */
  const menuBtn = $('[data-menu-toggle]');
  const mobileNav = $('[data-mobile-nav]');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
    });
  }

  /* ---------- product gallery ---------- */
  const gallery = $('[data-gallery]');
  if (gallery) {
    const mainImg = $('[data-gallery-main] img', gallery);
    const mainWrap = $('[data-gallery-main]', gallery);
    const thumbs = $$('[data-gallery-thumb]', gallery);

    const setMain = (t) => {
      thumbs.forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      // The main image starts with a srcset/sizes pair (for responsive
      // loading of the FIRST image). Browsers prefer srcset over src
      // when both are present, so just reassigning .src here would be
      // silently ignored — the old image would keep showing. Clearing
      // srcset/sizes first makes the plain .src actually take effect.
      mainImg.removeAttribute('srcset');
      mainImg.removeAttribute('sizes');
      mainImg.src = t.dataset.full;
      mainImg.alt = $('img', t).alt;
    };
    thumbs.forEach((t) => t.addEventListener('click', () => setMain(t)));

    // Preload every full-size gallery image in the background right after
    // load, so by the time someone clicks a thumbnail the browser already
    // has it cached and the swap is instant instead of waiting on a
    // network fetch (which is what made switching photos feel laggy).
    const preloadFullImages = () => {
      thumbs.forEach((t) => {
        const img = new Image();
        img.src = t.dataset.full;
      });
    };
    if ('requestIdleCallback' in window) requestIdleCallback(preloadFullImages);
    else setTimeout(preloadFullImages, 300);

    /* Apple-style lightbox */
    const lb = $('[data-lightbox]');
    if (lb) {
      const lbImg = $('[data-lb-img]', lb);
      const lbDots = $('[data-lb-dots]', lb);
      let lbList = [], lbIdx = 0;

      const visibleThumbs = () => thumbs.filter((t) => !t.hasAttribute('data-color-hidden'));
      const lbRender = () => {
        lbImg.src = lbList[lbIdx].dataset.full;
        lbDots.innerHTML = lbList.map((_, i) =>
          '<i class="' + (i === lbIdx ? 'is-on' : '') + '" data-i="' + i + '"></i>').join('');
      };
      const lbOpen = (idx) => {
        lbList = visibleThumbs();
        if (!lbList.length) return;
        lbIdx = Math.max(0, idx);
        lb.hidden = false; document.body.style.overflow = 'hidden';
        lbRender(); $('[data-lb-close]', lb).focus();
      };
      const lbClose = () => { lb.hidden = true; document.body.style.overflow = ''; };
      const lbStep = (d) => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbRender(); };

      mainWrap.addEventListener('click', () => {
        const active = $('.gallery__thumb.is-active', gallery);
        lbOpen(Math.max(0, visibleThumbs().indexOf(active)));
      });
      $('[data-lb-close]', lb).addEventListener('click', lbClose);
      $('[data-lb-prev]', lb).addEventListener('click', () => lbStep(-1));
      $('[data-lb-next]', lb).addEventListener('click', () => lbStep(1));
      lbDots.addEventListener('click', (e) => { if (e.target.dataset.i) { lbIdx = Number(e.target.dataset.i); lbRender(); } });
      document.addEventListener('keydown', (e) => {
        if (lb.hidden) return;
        if (e.key === 'Escape') lbClose();
        if (e.key === 'ArrowLeft') lbStep(-1);
        if (e.key === 'ArrowRight') lbStep(1);
      });
    }

    // Filter thumbs by selected color (media alt uses "vcolor:<Color>").
    // A photo only stays visible if it's tagged for this exact color, or
    // it has no vcolor: tag at all (a genuinely color-neutral shot, e.g.
    // packaging or a spec close-up). Photos tagged "vcolor:lifestyle" used
    // to always show regardless of the tag — that let a photo of one
    // color (e.g. Starlight) linger after switching to a different color
    // (e.g. Midnight Blue). Real lifestyle photos should be tagged with
    // whichever actual color they depict instead of the placeholder
    // "lifestyle" value, so they filter the same as any other photo.
    window.VolticalGalleryFilter = (color) => {
      if (!color) return;
      let firstVisible = null;
      thumbs.forEach((t) => {
        const alt = ($('img', t).alt || '').toLowerCase();
        const match = alt.indexOf('vcolor:' + color.toLowerCase()) !== -1 || alt.indexOf('vcolor:') === -1;
        t.toggleAttribute('data-color-hidden', !match);
        if (match && !firstVisible) firstVisible = t;
      });
      if (firstVisible && firstVisible !== $('.gallery__thumb.is-active:not([data-color-hidden])', gallery)) setMain(firstVisible);
    };
  }

  /* ---------- variant picker ---------- */
  const pform = $('[data-product-form]');
  if (pform) {
    const productJSON = JSON.parse($('[data-product-json]').textContent);
    const priceEl = $('[data-price]', pform.closest('.pinfo'));
    const idInput = $('input[name="id"]', pform);
    const btn = $('[data-atc]', pform);
    const btnLabel = $('[data-atc-label]', btn);
    const shipNote = $('[data-ship-note]');

    const selectedOptions = () =>
      $$('.opt', pform).map((o) => $('input:checked', o) && $('input:checked', o).value);

    const findVariant = () => {
      const sel = selectedOptions();
      return productJSON.variants.find((v) => v.options.every((o, i) => o === sel[i]));
    };

    const update = () => {
      const v = findVariant();
      $$('.opt', pform).forEach((o) => {
        const out = $('output', o);
        const checked = $('input:checked', o);
        if (out && checked) out.textContent = checked.value;
      });
      if (!v) { btn.disabled = true; btnLabel.textContent = window.VolticalStrings.unavailable; return; }
      idInput.value = v.id;
      priceEl.textContent = money(v.price);
      btn.disabled = !v.available;
      btnLabel.textContent = v.available ? window.VolicalATCDefault : window.VolticalStrings.soldOut;
      if (shipNote) shipNote.hidden = !v.available;

      const colorIdx = productJSON.options.findIndex((o) => /colou?r/i.test(o));
      if (colorIdx > -1 && window.VolticalGalleryFilter) window.VolticalGalleryFilter(v.options[colorIdx]);

      const capIdx = productJSON.options.findIndex((o) => /capacit|mah/i.test(o));
      if (capIdx > -1 && window.VolticalCalcSetCapacity) window.VolticalCalcSetCapacity(v.options[capIdx]);

      const url = new URL(location); url.searchParams.set('variant', v.id);
      history.replaceState(null, '', url);
    };

    window.VolicalATCDefault = btnLabel.textContent.trim();
    $$('.opt input', pform).forEach((i) => i.addEventListener('change', update));
    update();

    /* add to cart (AJAX, morphing button) */
    pform.addEventListener('submit', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      btn.classList.add('is-adding');
      const items = [{ id: Number(idInput.value), quantity: 1 }];
      const addonEl = $('[data-addon]', pform);
      if (addonEl && $('input', addonEl).checked) {
        items.push({ id: Number(addonEl.dataset.addonVariant), quantity: 1 });
      }
      fetchJSON('/cart/add.js', { method: 'POST', body: JSON.stringify({ items: items }) })
        .then(() => {
          btn.classList.remove('is-adding'); btn.classList.add('is-added');
          btnLabel.textContent = window.VolticalStrings.added;
          setTimeout(() => { btn.classList.remove('is-added'); btnLabel.textContent = window.VolicalATCDefault; }, 1800);
          Drawer.refresh(true);
        })
        .catch(() => { btn.classList.remove('is-adding'); btnLabel.textContent = window.VolticalStrings.error; });
    });
  }

  /* ---------- spec sheet (from VolticalData.specsSheets) ---------- */
  const specsEl = $('[data-specs]');
  if (specsEl && window.VolticalData && window.VolticalData.specsSheets) {
    const rows = window.VolticalData.specsSheets[specsEl.dataset.handle];
    if (rows && rows.length) {
      let hasEst = false;
      $('[data-specs-grid]', specsEl).innerHTML = rows.map(([k, v]) => {
        if (/\*$/.test(v)) hasEst = true;
        return '<div class="specs__row"><dt>' + k + '</dt><dd>' + v.replace(/\*$/, '') + (/\*$/.test(v) ? '<sup>*</sup>' : '') + '</dd></div>';
      }).join('');
      const note = $('[data-specs-note]', specsEl);
      if (note) note.hidden = !hasEst;
      specsEl.hidden = false;
    }
  }

  /* ---------- capacity calculator ---------- */
  const calc = $('[data-calc]');
  if (calc && window.VolticalData) {
    const D = window.VolticalData;
    const spec = D.products[calc.dataset.handle];
    if (spec) {
      const deviceSel = $('[data-calc-device]', calc);
      const out = $('[data-calc-out]', calc);
      const meter = $('[data-calc-meter] i', calc);
      const figCharges = $('[data-calc-charges]', calc);
      const figSpeed = $('[data-calc-speed]', calc);
      const figThird = $('[data-calc-third]', calc);
      const list = spec.type === 'watchcase' ? D.watches : D.iphones;

      list.forEach((d) => {
        const o = document.createElement('option');
        o.value = d.mah; o.textContent = d.name; o.dataset.hours = d.hours || '';
        deviceSel.appendChild(o);
      });

      let currentCapacity = Object.values(spec.capacities)[Object.values(spec.capacities).length - 1];
      window.VolticalCalcSetCapacity = (optText) => {
        const key = Object.keys(spec.capacities).find((k) => String(optText).replace(/[^0-9]/g, '').indexOf(k) === 0 || String(optText).replace(/[^0-9]/g, '') === k);
        if (key) { currentCapacity = spec.capacities[key]; run(); }
      };

      const run = () => {
        const mah = Number(deviceSel.value);
        if (!mah) return;
        out.classList.add('is-live');
        const usable = currentCapacity * D.efficiency[spec.type === 'watchcase' ? 'wireless' : 'wireless'];
        const usableWired = currentCapacity * D.efficiency.wired;

        if (spec.type === 'watchcase') {
          const charges = usable / mah;
          const hours = (deviceSel.selectedOptions[0].dataset.hours || 18) * charges;
          figCharges.innerHTML = '≈ <b>' + charges.toFixed(1) + '×</b>';
          figSpeed.innerHTML = '≈ <b>+' + Math.round(hours) + ' h</b>';
          figThird.innerHTML = '<b>' + spec.wirelessW + ' W</b>';
          meter.style.transform = 'scaleX(' + Math.min(charges / 3, 1) + ')';
        } else {
          const charges = usable / mah;
          const chargesWired = usableWired / mah;
          // time to ~full on wireless: device Wh / (rated W × ~70% avg delivered) with taper allowance
          const mins = Math.round(((mah * 3.85) / 1000 / (spec.wirelessW * 0.7)) * 60 * 1.15);
          figCharges.innerHTML = '≈ <b>' + charges.toFixed(1) + '×</b>';
          figSpeed.innerHTML = '≈ <b>' + (mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min') + '</b>';
          figThird.innerHTML = '≈ <b>' + chargesWired.toFixed(1) + '×</b>';
          meter.style.transform = 'scaleX(' + Math.min(charges / 3, 1) + ')';
        }
      };
      deviceSel.addEventListener('change', run);
    }
  }

  /* ---------- collection filters (client-side) ---------- */
  const plp = $('[data-plp]');
  if (plp) {
    const cards = $$('[data-plp-card]', plp);
    const chips = $$('.filter-chip', plp);
    const countEl = $('[data-plp-count]', plp);
    const emptyEl = $('[data-plp-empty]', plp);
    const active = { capacity: new Set(), color: new Set(), connector: new Set() };

    const apply = () => {
      let shown = 0;
      cards.forEach((c) => {
        const ok = Object.keys(active).every((k) => {
          if (!active[k].size) return true;
          const vals = (c.dataset[k] || '').toLowerCase().split('|');
          return [...active[k]].some((v) => vals.includes(v));
        });
        c.classList.toggle('is-filtered', !ok);
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown;
      if (emptyEl) emptyEl.hidden = shown !== 0;
    };

    chips.forEach((chip) => chip.addEventListener('click', () => {
      const k = chip.dataset.filterKey, v = chip.dataset.filterValue.toLowerCase();
      chip.classList.toggle('is-on');
      active[k].has(v) ? active[k].delete(v) : active[k].add(v);
      apply();
    }));

    const sortSel = $('[data-plp-sort]');
    if (sortSel) sortSel.addEventListener('change', () => {
      const url = new URL(location); url.searchParams.set('sort_by', sortSel.value); location.href = url;
    });
  }

  /* ---------- cart drawer + shipping protection ---------- */
  const Drawer = (() => {
    const el = $('[data-drawer]');
    if (!el) return { refresh: () => {} };
    const scrim = $('[data-scrim]');
    const linesEl = $('[data-drawer-lines]', el);
    const emptyEl = $('[data-drawer-empty]', el);
    const footEl = $('[data-drawer-foot]', el);
    const subtotalEl = $('[data-drawer-subtotal]', el);
    const countBadges = $$('[data-cart-count]');
    const protectBox = $('[data-protect]', el);
    const protectToggle = protectBox && $('input', protectBox);
    const protectPrice = protectBox && $('[data-protect-price]', protectBox);
    const P = window.Voltical.protection || {};
    let protectionProduct = null;
    let cart = null;
    let busy = false;

    if (P.enabled && P.handle) {
      fetchJSON('/products/' + P.handle + '.js')
        .then((p) => { protectionProduct = p; })
        .catch(() => { if (protectBox) protectBox.hidden = true; });
    } else if (protectBox) protectBox.hidden = true;

    const tierVariant = (subtotalCents) => {
      if (!protectionProduct) return null;
      const thresholds = String(P.thresholds || '50,100,150').split(',').map((n) => Number(n.trim()) * 100);
      const variants = protectionProduct.variants;
      let idx = thresholds.findIndex((t) => subtotalCents < t);
      if (idx === -1) idx = thresholds.length;
      return variants[Math.min(idx, variants.length - 1)];
    };

    const isProtection = (item) => protectionProduct && item.product_id === protectionProduct.id;

    const render = () => {
      const realLines = cart.items.filter((i) => !isProtection(i));
      countBadges.forEach((b) => {
        const n = realLines.reduce((n, i) => n + i.quantity, 0);
        b.textContent = n;
        b.hidden = n === 0;
        b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 350);
      });
      emptyEl.hidden = cart.item_count !== 0;
      footEl.hidden = cart.item_count === 0;
      if (protectBox) protectBox.hidden = cart.item_count === 0 || !protectionProduct;

      linesEl.innerHTML = realLines.map((i) => `
        <div class="cart-line" data-line-key="${i.key}">
          <div class="cart-line__img">${i.image ? `<img src="${i.image.replace(/(\.[a-z]+)(\?|$)/, '_160x$1$2')}" alt="">` : ''}</div>
          <div class="cart-line__body">
            <div class="cart-line__title">${i.product_title}</div>
            ${i.variant_title && i.variant_title !== 'Default Title' ? `<div class="cart-line__variant">${i.variant_title}</div>` : ''}
            <div class="cart-line__row">
              <span class="qty">
                <button data-qty="-1" aria-label="Decrease quantity">−</button>
                <output>${i.quantity}</output>
                <button data-qty="1" aria-label="Increase quantity">+</button>
              </span>
              <span class="cart-line__price">${money(i.final_line_price)}</span>
            </div>
            <button class="cart-line__remove" data-remove>${window.VolticalStrings.remove}</button>
          </div>
        </div>`).join('');

      const protLine = cart.items.find(isProtection);
      if (protectToggle) {
        protectToggle.checked = !!protLine;
        const v = protLine ? { price: protLine.final_line_price } : tierVariant(cart.items_subtotal_price);
        if (protectPrice && v) protectPrice.textContent = money(v.price);
      }
      subtotalEl.textContent = money(cart.total_price);
    };

    const mutate = (body) => {
      if (busy) return Promise.resolve();
      busy = true;
      return fetchJSON('/cart/change.js', { method: 'POST', body: JSON.stringify(body) })
        .then((c) => { cart = c; render(); })
        .finally(() => { busy = false; });
    };

    /* keep protection tier in sync with subtotal */
    const syncProtectionTier = () => {
      const protLine = cart.items.find(isProtection);
      if (!protLine) return Promise.resolve();
      const subtotalExcl = cart.items_subtotal_price - protLine.final_line_price;
      const should = tierVariant(subtotalExcl);
      if (should && should.id !== protLine.variant_id) {
        return mutate({ id: protLine.key, quantity: 0 })
          .then(() => fetchJSON('/cart/add.js', { method: 'POST', body: JSON.stringify({ id: should.id, quantity: 1 }) }))
          .then(() => refresh());
      }
      return Promise.resolve();
    };

    linesEl.addEventListener('click', (e) => {
      const line = e.target.closest('[data-line-key]');
      if (!line) return;
      const key = line.dataset.lineKey;
      const item = cart.items.find((i) => i.key === key);
      if (e.target.matches('[data-qty]')) {
        mutate({ id: key, quantity: Math.max(0, item.quantity + Number(e.target.dataset.qty)) }).then(syncProtectionTier);
      } else if (e.target.matches('[data-remove]')) {
        mutate({ id: key, quantity: 0 }).then(syncProtectionTier);
      }
    });

    if (protectToggle) protectToggle.addEventListener('change', () => {
      const protLine = cart && cart.items.find(isProtection);
      if (protectToggle.checked && !protLine) {
        const v = tierVariant(cart.items_subtotal_price);
        if (!v) return;
        fetchJSON('/cart/add.js', { method: 'POST', body: JSON.stringify({ id: v.id, quantity: 1, properties: { _protection: 'true' } }) })
          .then(() => refresh());
      } else if (!protectToggle.checked && protLine) {
        mutate({ id: protLine.key, quantity: 0 });
      }
    });

    const open = () => { el.classList.add('is-open'); scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add('is-open')); document.body.style.overflow = 'hidden'; $('[data-drawer-close]', el).focus(); };
    const close = () => { el.classList.remove('is-open'); scrim.classList.remove('is-open'); setTimeout(() => { scrim.hidden = true; }, 350); document.body.style.overflow = ''; };
    const refresh = (openAfter) => fetchJSON('/cart.js').then((c) => { cart = c; render(); if (openAfter) open(); });

    $$('[data-cart-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); refresh(true); }));
    $('[data-drawer-close]', el).addEventListener('click', close);
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.classList.contains('is-open')) close(); });

    refresh(false);
    return { refresh, open, close };
  })();

})();
