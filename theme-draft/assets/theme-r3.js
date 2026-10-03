/* ============================================================
   VOLTICAL — theme.js
   No dependencies. Modules: util, reveal, header, gallery,
   variants, add-to-cart, calculator, collection filters,
   cart drawer (+ shipping protection).
   rev: scroll-reveal cascade + design-mode fix
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
    const gridWrap = gallery.closest('.product__grid');
    const thumbs = $$('[data-gallery-thumb]', gallery);

    // Approximates the photo's backdrop colour by averaging a tiny
    // corner sample of its ALREADY-LOADED thumbnail — a one-off canvas
    // read, not a live CSS filter. An earlier version used a
    // filter:blur() layer that had to be repainted every touchmove
    // frame during the swipe drag, which is what caused the swipe to
    // stutter; this runs once per photo change and just sets a plain
    // background-color, so it costs nothing during the drag itself.
    const sampleCornerColor = (thumbImgEl, apply) => {
      const run = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 6; c.height = 6;
          const ctx = c.getContext('2d');
          const sw = thumbImgEl.naturalWidth * 0.12 || 1;
          const sh = thumbImgEl.naturalHeight * 0.12 || 1;
          ctx.drawImage(thumbImgEl, 0, 0, sw, sh, 0, 0, 6, 6);
          const d = ctx.getImageData(0, 0, 6, 6).data;
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
          apply('rgb(' + Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n) + ')');
        } catch (e) { /* tainted canvas (CORS) or similar — just keep the CSS fallback colour */ }
      };
      if (thumbImgEl.complete) run();
      else thumbImgEl.addEventListener('load', run, { once: true });
    };
    const applyBgColor = (t) => {
      sampleCornerColor($('img', t), (rgb) => {
        if (mainWrap) mainWrap.style.setProperty('--gallery-bg-color', rgb);
        if (gridWrap) gridWrap.style.setProperty('--gallery-bg-color', rgb);
      });
    };
    if (thumbs.length) applyBgColor($('.gallery__thumb.is-active', gallery) || thumbs[0]);

    // dir: -1 (came from the right, i.e. "previous"), 1 ("next"), or 0/
    // omitted for an instant swap (e.g. switching color filters) with no
    // slide. Old image fades+slides out one direction, the new one
    // fades+slides in from the opposite side — same single <img>, just
    // animated across the swap so it reads as continuous motion instead
    // of an instant cut.
    const setMain = (t, dir) => {
      thumbs.forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      const apply = () => {
        // The main image starts with a srcset/sizes pair (for responsive
        // loading of the FIRST image). Browsers prefer srcset over src
        // when both are present, so just reassigning .src here would be
        // silently ignored — the old image would keep showing. Clearing
        // srcset/sizes first makes the plain .src actually take effect.
        mainImg.removeAttribute('srcset');
        mainImg.removeAttribute('sizes');
        mainImg.src = t.dataset.full;
        mainImg.alt = $('img', t).alt;
        applyBgColor(t);
      };
      if (!dir) { apply(); return; }
      mainImg.style.transition = 'opacity .16s ease, transform .16s ease';
      mainImg.style.opacity = '0';
      mainImg.style.transform = 'translateX(' + (dir * -16) + 'px)';
      setTimeout(() => {
        apply();
        mainImg.style.transition = 'none';
        mainImg.style.transform = 'translateX(' + (dir * 16) + 'px)';
        void mainImg.offsetWidth; // force reflow so the next transition actually animates
        mainImg.style.transition = 'opacity .22s ease, transform .22s ease';
        mainImg.style.opacity = '1';
        mainImg.style.transform = 'translateX(0)';
      }, 160);
    };
    const visibleThumbs = () => thumbs.filter((t) => !t.hasAttribute('data-color-hidden'));
    thumbs.forEach((t) => t.addEventListener('click', () => {
      const visible = visibleThumbs();
      const activeIdx = visible.indexOf($('.gallery__thumb.is-active', gallery));
      const newIdx = visible.indexOf(t);
      const dir = newIdx === activeIdx ? 0 : (newIdx > activeIdx ? 1 : -1);
      setMain(t, dir);
    }));

    // Desktop click-through arrows (hidden on mobile via CSS — swipe
    // covers that there). Step to the next/previous VISIBLE thumb,
    // wrapping around — full-width slide (the outgoing photo exits one
    // side, the incoming one slides in from the other), same look as
    // the touch swipe's "commit" animation below, not the smaller
    // fade+16px used by thumbnail clicks.
    // A second arrow click landing mid-slide used to either stack a new
    // `incoming` image on top of the still-animating one, or (an
    // earlier fix) just get ignored until the current slide finished —
    // both feel wrong for fast clicking. Instead: a click mid-slide
    // instantly SNAPS the current slide to its finished state (no
    // waiting for its animation), then immediately starts the next one
    // from that clean state — every click is responsive, nothing ever
    // stacks.
    let gallerySlideTimeout = null;
    let finishCurrentSlide = null;
    let pendingIncoming = null; // set the instant `incoming` is created, cleared once its rAFs assign finishCurrentSlide — covers an interrupt landing in that brief window too
    const slideGallery = (dir) => {
      const visible = visibleThumbs();
      if (visible.length < 2) return;
      clearTimeout(gallerySlideTimeout);
      if (finishCurrentSlide) {
        finishCurrentSlide();
        finishCurrentSlide = null;
      } else if (pendingIncoming) {
        pendingIncoming.remove();
        pendingIncoming = null;
        mainImg.style.transition = 'none';
        mainImg.style.transform = '';
        mainImg.style.opacity = '';
      }
      const activeIdx = visible.indexOf($('.gallery__thumb.is-active', gallery));
      const target = visible[(activeIdx + dir + visible.length) % visible.length];
      const containerW = mainWrap.clientWidth || 1;
      // Longer + a proper iOS-style decelerate curve (heavy deceleration,
      // near-zero overshoot) instead of the sharper 220ms used by the
      // touch-swipe commit — a deliberate, unhurried glide reads as more
      // "considered"/premium than a snappy flick. A soft opacity
      // cross-fade rides along with the slide for polish; no scale
      // change, since that's what read as "zooming" before.
      const settleMs = 550;
      const curve = 'cubic-bezier(.32,.72,0,1)';
      const ease = 'transform ' + settleMs + 'ms ' + curve + ', opacity ' + settleMs + 'ms ' + curve;

      // Match mainImg's own box exactly (desktop insets it with padding
      // and uses object-fit:contain, not cover/edge-to-edge) — using
      // top:0/left:0/100%/100% here ignored that padding and filled the
      // whole box instead, which is what read as a brief "zoom" before
      // the swap. Copying mainImg's own computed box + object-fit keeps
      // the incoming photo pixel-identical in size/position to it.
      const mainImgStyle = getComputedStyle(mainImg);
      const incoming = document.createElement('img');
      incoming.src = target.dataset.full;
      incoming.alt = '';
      incoming.setAttribute('aria-hidden', 'true');
      incoming.style.cssText = 'position:absolute;top:' + mainImg.offsetTop + 'px;left:' + mainImg.offsetLeft + 'px;' +
        'width:' + mainImg.offsetWidth + 'px;height:' + mainImg.offsetHeight + 'px;' +
        'object-fit:' + mainImgStyle.objectFit + ';pointer-events:none;z-index:1;opacity:.6;' +
        'transform:translateX(' + (dir * containerW) + 'px)';
      mainWrap.appendChild(incoming);
      pendingIncoming = incoming;
      mainImg.style.transition = 'none';

      // incoming is a BRAND NEW element — its initial (offscreen)
      // transform hasn't been committed to a rendered frame yet, so a
      // single forced reflow (offsetWidth) isn't reliably enough to
      // make the browser animate FROM it; the initial and final values
      // can get coalesced into one frame with no visible motion, which
      // is what "still not seeing a slide" was. Two nested rAFs
      // guarantee a real painted frame happens in between, so the
      // transition below always has a committed starting point to
      // animate from.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          pendingIncoming = null; // now tracked via finishCurrentSlide below instead
          mainImg.style.transition = ease;
          incoming.style.transition = ease;
          mainImg.style.transform = 'translateX(' + (dir * -containerW) + 'px)';
          mainImg.style.opacity = '.6';
          incoming.style.transform = 'translateX(0)';
          incoming.style.opacity = '1';

          // Same finish logic either fires normally after settleMs, OR
          // gets called immediately (synchronously, skipping the wait)
          // if another arrow click interrupts this slide first — see
          // finishCurrentSlide above.
          finishCurrentSlide = () => {
            thumbs.forEach((x) => x.classList.remove('is-active'));
            target.classList.add('is-active');
            mainImg.style.transition = 'none';
            mainImg.removeAttribute('srcset');
            mainImg.removeAttribute('sizes');
            mainImg.src = target.dataset.full;
            mainImg.alt = $('img', target).alt;
            mainImg.style.transform = '';
            mainImg.style.opacity = '';
            incoming.remove();
            finishCurrentSlide = null;
            setTimeout(() => applyBgColor(target), 0);
          };
          // Counting settleMs from HERE (once the transition actually
          // starts, after the two rAFs above), not from slideGallery's
          // own call time — otherwise this could fire before the
          // animation visually finishes and cut it short.
          gallerySlideTimeout = setTimeout(() => { if (finishCurrentSlide) finishCurrentSlide(); }, settleMs);
        });
      });
    };
    const prevBtn = $('[data-gallery-prev]', gallery);
    const nextBtn = $('[data-gallery-next]', gallery);
    // stopPropagation: .gallery__main itself has its own click handler
    // (opens the lightbox, wired up below) — without this, clicking an
    // arrow would also open the lightbox.
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); slideGallery(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); slideGallery(1); });

    // Swipe left/right on the main image to step through photos — iPhone
    // Photos style: the photo tracks your finger 1:1 as you drag (with
    // the next/previous photo sliding in from off-screen live, not just
    // appearing after you let go), then either continues off-screen into
    // that photo or springs back to center depending on how far you'd
    // dragged when you lifted your finger.
    let gallerySwipeMoved = false;
    (function () {
      let startX = 0, startY = 0, dragging = false, axisLocked = null, containerW = 0;
      let peek = null; // { img, dir, target }
      const commitFraction = 0.28;
      const settleMs = 220;

      const removePeek = () => { if (peek) { peek.img.remove(); peek = null; } };

      // Peek is styled inline here (not via a CSS class) to be byte-for-
      // byte the same box as mainImg — width:100%/height:100%/cover, no
      // padding or inset — since that exact match is what makes the
      // swipe/commit transition seamless. Every offscreen position is a
      // PIXEL offset off one shared containerW measurement (not '%',
      // which resolves against each element's own box width).
      const addPeek = (dir) => {
        const visible = visibleThumbs();
        const activeIdx = visible.indexOf($('.gallery__thumb.is-active', gallery));
        if (activeIdx === -1 || visible.length < 2) return null;
        const target = visible[(activeIdx + dir + visible.length) % visible.length];
        const img = document.createElement('img');
        img.src = target.dataset.full;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
          'object-fit:cover;pointer-events:none;z-index:1;' +
          'transform:translateX(' + (dir * containerW) + 'px)';
        mainWrap.appendChild(img);
        return { img, dir, target };
      };

      mainWrap.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = true;
        axisLocked = null;
        gallerySwipeMoved = false;
        containerW = mainWrap.clientWidth || 1;
        mainImg.style.transition = 'none';
      }, { passive: true });

      mainWrap.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (axisLocked === null) axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axisLocked !== 'x') return;
        e.preventDefault();
        if (Math.abs(dx) > 10) gallerySwipeMoved = true;
        const dir = dx < 0 ? 1 : -1;
        if (!peek || peek.dir !== dir) { removePeek(); peek = addPeek(dir); }
        mainImg.style.transform = 'translateX(' + dx + 'px)';
        if (peek) peek.img.style.transform = 'translateX(' + (dir * containerW + dx) + 'px)';
      }, { passive: false });

      mainWrap.addEventListener('touchend', (e) => {
        if (!dragging) return;
        dragging = false;
        if (axisLocked !== 'x') { removePeek(); mainImg.style.transition = ''; mainImg.style.transform = ''; return; }
        const dx = e.changedTouches[0].clientX - startX;
        const dir = dx < 0 ? 1 : -1;
        const commit = peek && Math.abs(dx) > containerW * commitFraction;
        const ease = 'transform ' + settleMs + 'ms cubic-bezier(.22,.61,.36,1)';

        mainImg.style.transition = ease;
        if (peek) peek.img.style.transition = ease;

        if (commit) {
          mainImg.style.transform = 'translateX(' + (dir * -containerW) + 'px)';
          peek.img.style.transform = 'translateX(0)';
          const target = peek.target;
          setTimeout(() => {
            thumbs.forEach((x) => x.classList.remove('is-active'));
            target.classList.add('is-active');
            mainImg.style.transition = 'none';
            mainImg.removeAttribute('srcset');
            mainImg.removeAttribute('sizes');
            mainImg.src = target.dataset.full;
            mainImg.alt = $('img', target).alt;
            mainImg.style.transform = '';
            removePeek();
            // deferred: canvas colour sampling is synchronous work, kept
            // off the swap frame itself so it can't contribute any jank
            // right when the peek/mainImg switch happens.
            setTimeout(() => applyBgColor(target), 0);
          }, settleMs);
        } else {
          mainImg.style.transform = 'translateX(0)';
          if (peek) peek.img.style.transform = 'translateX(' + (dir * containerW) + 'px)';
          setTimeout(removePeek, settleMs);
        }
      }, { passive: true });
    })();

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

      // Swipe left/right inside the lightbox too, same iPhone-Photos
      // live-drag feel as the main gallery — the prev/next arrows are
      // hidden on mobile (see theme-r2.css), so swipe is the only way
      // to move between photos there.
      (function () {
        let startX = 0, startY = 0, dragging = false, axisLocked = null, containerW = 0;
        let peek = null; // { img }
        const commitFraction = 0.28;
        const settleMs = 220;

        const removePeek = () => { if (peek) { peek.remove(); peek = null; } };

        const addPeek = (dir) => {
          const nextIdx = (lbIdx + dir + lbList.length) % lbList.length;
          const img = document.createElement('img');
          img.src = lbList[nextIdx].dataset.full;
          img.alt = '';
          img.setAttribute('aria-hidden', 'true');
          img.style.cssText = 'position:absolute;top:50%;left:50%;max-width:min(88vw,1200px);' +
            'max-height:84vh;object-fit:contain;pointer-events:none;' +
            'transform:translate(-50%,-50%) translateX(' + (dir * containerW) + 'px)';
          lb.appendChild(img);
          return img;
        };

        lbImg.addEventListener('touchstart', (e) => {
          if (e.touches.length !== 1) return;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          dragging = true;
          axisLocked = null;
          containerW = lb.clientWidth || window.innerWidth;
          lbImg.style.transition = 'none';
        }, { passive: true });

        lbImg.addEventListener('touchmove', (e) => {
          if (!dragging) return;
          const dx = e.touches[0].clientX - startX;
          const dy = e.touches[0].clientY - startY;
          if (axisLocked === null) axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (axisLocked !== 'x') return;
          e.preventDefault();
          const dir = dx < 0 ? 1 : -1;
          if (!peek) peek = addPeek(dir);
          lbImg.style.transform = 'translateX(' + dx + 'px)';
          peek.style.transform = 'translate(-50%,-50%) translateX(' + (dir * containerW + dx) + 'px)';
        }, { passive: false });

        lbImg.addEventListener('touchend', (e) => {
          if (!dragging) return;
          dragging = false;
          if (axisLocked !== 'x') { removePeek(); lbImg.style.transition = ''; lbImg.style.transform = ''; return; }
          const dx = e.changedTouches[0].clientX - startX;
          const dir = dx < 0 ? 1 : -1;
          const commit = peek && Math.abs(dx) > containerW * commitFraction;
          const ease = 'transform ' + settleMs + 'ms cubic-bezier(.22,.61,.36,1)';

          lbImg.style.transition = ease;
          if (peek) peek.style.transition = ease;

          if (commit) {
            lbImg.style.transform = 'translateX(' + (dir * -containerW) + 'px)';
            peek.style.transform = 'translate(-50%,-50%) translateX(0)';
            setTimeout(() => {
              lbIdx = (lbIdx + dir + lbList.length) % lbList.length;
              lbImg.style.transition = 'none';
              lbRender();
              lbImg.style.transform = '';
              removePeek();
            }, settleMs);
          } else {
            lbImg.style.transform = 'translateX(0)';
            if (peek) peek.style.transform = 'translate(-50%,-50%) translateX(' + (dir * containerW) + 'px)';
            setTimeout(removePeek, settleMs);
          }
        }, { passive: true });
      })();

      mainWrap.addEventListener('click', () => {
        if (gallerySwipeMoved) { gallerySwipeMoved = false; return; }
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
      $$('[data-addon]', pform).forEach((addonEl) => {
        if ($('input', addonEl).checked) {
          items.push({ id: Number(addonEl.dataset.addonVariant), quantity: 1 });
        }
      });
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
    let qtyOpenKey = null;                           // the line whose quantity menu is open (its pencil is hidden)
    const PENCIL = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.2 2.3a1.6 1.6 0 0 1 2.3 0l.2.2a1.6 1.6 0 0 1 0 2.3L5.6 12.9 2.4 13.6l.7-3.2 8.1-8.1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m9.9 3.7 2.4 2.4" stroke="currentColor" stroke-width="1.5"/></svg>';

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

    /* Shipping, as set in Shopify's delivery profiles: Standard is 6.99 in
       the customer's currency until the order total reaches that currency's
       free-shipping amount, then shipping is free. Currencies with no rate
       here (no delivery zone uses them) show "Calculated at checkout". */
    const SHIP_RATE = 699;
    const SHIP_FREE_FROM = {
      GBP: 45, EUR: 55, AUD: 90, CAD: 90, NZD: 110, DKK: 395, NOK: 590,
      SEK: 580, CZK: 1270, MXN: 1050, INR: 5720, IDR: 1080000
    };
    const shipEl = $('[data-ship]', el);
    const shipMethod = shipEl && $('[data-ship-method]', shipEl);
    const shipPrice = shipEl && $('[data-ship-price]', shipEl);
    const totalLabel = $('[data-total-label]', el);
    const totalHint = $('[data-total-hint]', el);
    const shippingFor = (c) => {
      const from = SHIP_FREE_FROM[c.currency];
      if (from == null) return null;
      return c.total_price >= from * 100 ? 0 : SHIP_RATE;
    };

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

      /* Each product is a bubble like the shipping one: the short name
         ("Core", not "Voltical Core 5K & 10K") as the small grey label, the
         options under it, one per line ("Titanium Gold", then "10,000mAh"), the price on the
         right under "Qty 1" and a pencil. Tapping it (data-qty-edit)
         opens the quantity menu below. */
      const shortName = (t) => t.replace(/^Voltical\s+/i, '').replace(/\s+\d+K\s*(&|and|\/)\s*\d+K$/i, '');
      const options = (v) => v.split(' / ').map((o) => `<span>${o.replace(/\s*mah\b/i, 'mAh')}</span>`).join(' ');
      linesEl.innerHTML = realLines.map((i) => `
        <div class="cart-line${i.key === qtyOpenKey ? ' is-qty-open' : ''}" data-line-key="${i.key}">
          <div class="cart-line__img">${i.image ? `<img src="${i.image.replace(/(\.[a-z]+)(\?|$)/, '_160x$1$2')}" alt="" decoding="sync">` : ''}</div>
          <div class="cart-line__body">
            <div class="cart-line__title">${shortName(i.product_title)}</div>
            ${i.variant_title && i.variant_title !== 'Default Title' ? `<div class="cart-line__variant">${options(i.variant_title)}</div>` : ''}
          </div>
          <div class="cart-line__side">
            <button type="button" class="cart-line__qty" data-qty-edit aria-label="Quantity ${i.quantity}, edit">
              <span class="cart-line__qty-label">Qty</span>
              <span class="cart-line__qty-num">${i.quantity}</span>
              <span class="cart-line__pencil">${PENCIL}</span>
            </button>
            <label class="cart-line__qty-tap" data-qty-edit aria-hidden="true"><input type="checkbox" switch tabindex="-1"></label>
            <span class="cart-line__price">${money(i.final_line_price)}</span>
          </div>
        </div>`).join('');

      if (shipEl) shipEl.hidden = cart.item_count === 0;
      paintTotals(cart);
      if (qm && !qm.closing) previewQty(qm.key, qm.shown);   // its quantity menu is open: keep the slider's number
    };

    // the bag's sums (protection, shipping, total), for the cart or for the
    // cart as it would be while the quantity slider moves (previewQty)
    const paintTotals = (c) => {
      const protLine = c.items.find(isProtection);
      if (protectToggle) {
        protectToggle.checked = !!protLine;
        const v = protLine ? { price: protLine.final_line_price } : tierVariant(c.items_subtotal_price);
        if (protectPrice && v) protectPrice.textContent = money(v.price);
      }
      const S = window.VolticalStrings;
      let ship = shippingFor(c);
      if (ship && !c.items.some((i) => i.quantity && !isProtection(i))) ship = 0;   // nothing left to ship
      if (shipEl) {
        shipMethod.textContent = ship == null ? S.shipAtCheckout : ship === 0 ? S.shipFree : S.shipStandard;
        shipPrice.textContent = ship == null ? '' : ship === 0 ? S.shipFreePrice : money(ship);
      }
      if (ship == null) {
        totalLabel.textContent = S.subtotal;
        totalHint.textContent = S.taxesNote;
        subtotalEl.textContent = money(c.total_price);
      } else {
        totalLabel.textContent = S.total;
        totalHint.textContent = S.totalNote;
        subtotalEl.textContent = money(c.total_price + ship);
      }
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
      if (!item) return;
      if (e.target.closest('[data-qty-edit]') && !qm) { tick(); openQtyMenu(item, line); }
    });

    /* Quantity menu, copied from the iPhone's stepped slider pop-up in the
       owner's screen recording (measured frame by frame at 60fps):
       - It grows out of the pencil. A 27px circle on the pencil morphs into
         a 334 x 72 pill centred on the card, on the pencil's row, on a
         spring fitted to the recording (response 0.338s, damping 0.822,
         fast start): about a third of a second, ~1% overshoot. The pencil
         becomes the knob and fades as it grows; "Qty 2" fades in and rises
         to 70px above the pill's centre. Closing runs it back into the
         pencil.
       - The page around it frosts: strongest at the pill, fading out about
         250px above and below it.
       - In the pill: a 48px track, a blue fill (#2F5BEF) from the left to
         4px past a 40px white knob, and 12px dots at the stops (grey, or
         20% white on the blue). A soft blue glow sits at its right end.
       - Touching it puffs it up 2%. The knob follows the finger, with a
         little give past either end, and the label and a haptic tick
         change at each stop. Letting go springs the knob onto the nearest
         stop and the pill settles back with a small bounce. Tapping a stop
         jumps there.
       - It stays open after letting go. Tapping anywhere else (or Escape,
         Enter) closes it and saves the quantity. Stop 0 is Remove (the
         label reads "Remove" in red). */
    const QM = { W: 334, H: 72, P: 12, T: 48, K: 40, D: 12, FROM: 27 };
    const qmReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const qmEl = (() => {
      const root = document.createElement('div');
      root.className = 'qty-menu';
      root.hidden = true;
      root.innerHTML = `
        <div class="qty-menu__frost" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="qty-menu__glow" aria-hidden="true"></div>
        <div class="qty-menu__label" aria-hidden="true"><b>Qty</b> <span></span></div>
        <div class="qty-menu__pill" role="slider" tabindex="-1" aria-label="Quantity" aria-valuemin="0">
          <div class="qty-menu__track">
            <div class="qty-menu__dots"></div>
            <div class="qty-menu__fill"><div class="qty-menu__dots"></div></div>
            <div class="qty-menu__knob">${PENCIL}</div>
          </div>
        </div>
        <input type="checkbox" switch class="qty-menu__hap" tabindex="-1" aria-hidden="true">`;
      document.body.appendChild(root);
      const dots = $$('.qty-menu__dots', root);
      return {
        root,
        frost: $$('.qty-menu__frost i', root),
        glow: $('.qty-menu__glow', root),
        label: $('.qty-menu__label', root),
        value: $('.qty-menu__label span', root),
        pill: $('.qty-menu__pill', root),
        track: $('.qty-menu__track', root),
        fill: $('.qty-menu__fill', root),
        dotsOff: dots[0],
        dotsOn: dots[1],
        knob: $('.qty-menu__knob', root),
        knobPencil: $('.qty-menu__knob svg', root),
        hap: $('.qty-menu__hap', root)
      };
    })();

    /* Haptic ticks. Android: navigator.vibrate. iPhone Safari has no
       vibration API, and since iOS 26.5 a switch flipped from script is
       silent, so iPhone ticks come from real switches under the finger: a
       hidden one in the label over "Qty 1" (tapping it ticks) and the
       slider's invisible one (.qty-menu__hap, below). */
    const tick = typeof navigator.vibrate === 'function'
      ? () => { try { navigator.vibrate(8); } catch (e) { /* not allowed yet */ } }
      : () => {};

    // A spring that can be re-aimed mid-flight, stepped each frame.
    // response in seconds and damping ratio, as SwiftUI describes springs.
    const qmSpring = (x) => ({
      x, v: 0, to: x, w: 20, z: 1,
      aim(to, response, damping, v) {
        this.to = to; this.w = (2 * Math.PI) / response; this.z = damping;
        if (v != null) this.v = v;
      },
      set(x) { this.x = this.to = x; this.v = 0; },
      step(dt) {
        const n = Math.ceil(dt / 0.004);
        const h = dt / n;
        for (let i = 0; i < n; i++) {
          this.v += (-this.w * this.w * (this.x - this.to) - 2 * this.z * this.w * this.v) * h;
          this.x += this.v * h;
        }
        if (Math.abs(this.x - this.to) < 1e-4 && Math.abs(this.v) < 1e-3) { this.x = this.to; this.v = 0; return false; }
        return true;
      }
    });

    let qm = null;
    let qmFrame = 0;
    let qmLast = 0;
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const qmStop = (x) => Math.max(0, Math.min(qm.n - 1, Math.round(x)));
    const qmLine = (key) => Array.from(linesEl.children).find((n) => n.dataset.lineKey === key);
    // the stop under a finger, as a fraction, with a little give past the ends
    const qmStopAt = (clientX) => {
      const left = qm.to.x - qm.W / 2 + QM.P;
      let raw = ((clientX - left - QM.T / 2) / (qm.W - 2 * QM.P - QM.T)) * (qm.n - 1);
      const give = (o) => (1 - 1 / (o * 0.6 + 1)) * 0.12;
      if (raw < 0) raw = -give(-raw);
      else if (raw > qm.n - 1) raw = qm.n - 1 + give(raw - (qm.n - 1));
      return raw;
    };
    /* The bag as it would be with this line at quantity q, worked out here
       so the line's price, the shipping and the total change with each stop
       of the slider. Closing the menu saves it, and the store's own numbers
       then replace these. */
    const previewQty = (key, q) => {
      const item = cart.items.find((i) => i.key === key);
      const line = qmLine(key);
      if (!item || !line) return;
      const linePrice = item.final_price * q;
      let d = linePrice - item.final_line_price;
      const items = cart.items.map((i) => (i === item ? Object.assign({}, i, { quantity: q, final_line_price: linePrice }) : i));
      const prot = items.find(isProtection);
      if (prot) {                                    // protection is priced on the rest of the bag (syncProtectionTier)
        const tier = tierVariant(cart.items_subtotal_price + d - prot.final_line_price);
        if (tier) {
          d += tier.price - prot.final_line_price;
          items[items.indexOf(prot)] = Object.assign({}, prot, { final_line_price: tier.price });
        }
      }
      $('.cart-line__qty-num', line).textContent = q;
      $('.cart-line__qty', line).setAttribute('aria-label', 'Quantity ' + q + ', edit');
      $('.cart-line__price', line).textContent = money(linePrice);
      paintTotals(Object.assign({}, cart, {
        items,
        items_subtotal_price: cart.items_subtotal_price + d,
        total_price: cart.total_price + d,
        item_count: cart.item_count + q - item.quantity
      }));
    };
    const qmShow = (v, haptic) => {
      if (v === qm.shown) return;
      qm.shown = v;
      const text = v ? String(v) : window.VolticalStrings.remove;
      qmEl.value.textContent = text;
      qmEl.label.classList.toggle('is-remove', !v);  // stop 0 reads "Remove", in red
      qmEl.pill.setAttribute('aria-valuenow', String(v));
      qmEl.pill.setAttribute('aria-valuetext', text);
      previewQty(qm.key, v);
      if (haptic) tick();
    };

    const qmPaint = () => {
      const p = qm.p.x;
      const pc = Math.max(0, p);
      const w = QM.FROM + (qm.W - QM.FROM) * pc;
      const h = QM.FROM + (QM.H - QM.FROM) * pc;
      const cx = qm.from.x + (qm.to.x - qm.from.x) * p;
      const cy = qm.from.y + (qm.to.y - qm.from.y) * p;
      const sc = h / QM.H;
      const pad = QM.P * sc;
      const t = QM.T * sc;
      const tw = w - 2 * pad;
      const span = Math.max(0, tw - t);
      const d = QM.D * sc;
      const kd = QM.K * sc;
      const kx = t / 2 + (span * qm.k.x) / (qm.n - 1);
      const E = qmEl;
      // faded layer by layer: fading their parent would switch the blurs off
      const fo = String(clamp01(p * 1.15));
      E.frost.forEach((f) => { f.style.opacity = fo; });
      E.pill.style.width = w + 'px';
      E.pill.style.height = h + 'px';
      E.pill.style.borderRadius = h / 2 + 'px';
      E.pill.style.opacity = String(clamp01(p / 0.12));
      E.pill.style.transform = 'translate(' + (cx - w / 2) + 'px,' + (cy - h / 2) + 'px) scale(' + qm.s.x + ')';
      E.track.style.cssText = 'left:' + pad + 'px;top:' + pad + 'px;width:' + tw + 'px;height:' + t + 'px;border-radius:' + t / 2 + 'px';
      E.fill.style.width = kx + t / 2 + 'px';
      E.fill.style.borderRadius = t / 2 + 'px';
      E.dotsOn.style.width = tw + 'px';
      for (const layer of [E.dotsOff, E.dotsOn]) {
        Array.from(layer.children).forEach((dot, i) => {
          dot.style.cssText = 'width:' + d + 'px;height:' + d + 'px;transform:translate(' +
            (t / 2 + (span * i) / (qm.n - 1) - d / 2) + 'px,' + (t / 2 - d / 2) + 'px)';
        });
      }
      E.knob.style.cssText = 'width:' + kd + 'px;height:' + kd + 'px;transform:translate(' + (kx - kd / 2) + 'px,' + (t / 2 - kd / 2) + 'px)';
      E.knobPencil.style.opacity = String(clamp01(1 - p / 0.3));
      E.label.style.opacity = String(clamp01((p - 0.25) / 0.45));
      E.label.style.transform = 'translate(' + cx + 'px,' + (cy - h / 2 - 34 * Math.min(1, pc)) + 'px) translate(-50%,-50%)';
      E.glow.style.transform = 'translate(' + (cx + w / 2 - 6) + 'px,' + cy + 'px)';
      if (!qm.hapT) {                                // the invisible switch lies over the pill
        E.hap.style.cssText = 'width:' + w + 'px;height:' + h + 'px;transform:' + E.pill.style.transform +
          (qm.closing ? ';pointer-events:none' : '');
      }
    };

    const qmFinish = () => {
      const line = qmLine(qm.key);
      if (line) line.classList.remove('is-qty-open');
      qtyOpenKey = null;
      qm = null;
      qmEl.root.hidden = true;
      qmEl.root.classList.remove('is-settled');
      el.focus({ preventScroll: true });             // back to the bag card, as when it opened
    };
    const qmLoop = (now) => {
      qmFrame = 0;
      if (!qm) return;
      const dt = Math.min(1 / 30, Math.max(0, (now - qmLast) / 1000));
      qmLast = now;
      if (qm.closing) {                              // land on the pencil where it is now
        const pen = qmLine(qm.key);
        const b = pen && $('.cart-line__pencil', pen).getBoundingClientRect();
        if (b && b.width) qm.from = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      let moving = qm.p.step(dt);
      moving = qm.k.step(dt) || moving;
      moving = qm.s.step(dt) || moving;
      if (!qm.closing && !qm.settled && qm.p.x > 0.98) { qm.settled = true; qmEl.root.classList.add('is-settled'); }
      if (qm.closing && qm.p.x <= 0.01) { qmFinish(); return; }
      qmPaint();
      if (moving || qm.drag) qmFrame = requestAnimationFrame(qmLoop);
    };
    const qmRun = () => {                            // start the frame loop if it's idle
      if (!qmFrame) { qmLast = performance.now() - 16; qmFrame = requestAnimationFrame(qmLoop); }
    };

    const applyQty = (key, q) => {                   // wait out a change already on its way
      if (busy) { setTimeout(() => applyQty(key, q), 120); return; }
      mutate({ id: key, quantity: q }).then(syncProtectionTier)
        .catch(() => render());                      // refused: back to the bag's real numbers
    };
    const closeQtyMenu = () => {
      if (!qm || qm.closing) return;
      qm.closing = true;
      qm.drag = null;
      const v = qmStop(qm.k.to);
      if (v !== qm.start) applyQty(qm.key, v);
      qmEl.root.classList.remove('is-settled');
      qm.s.aim(1, 0.2, 1);
      if (qmReduce.matches) qm.p.set(0);
      else qm.p.aim(0, 0.3, 1, -4);
      qmRun();
    };
    const openQtyMenu = (item, line) => {
      if (qm) return;
      const pen = $('.cart-line__pencil', line).getBoundingClientRect();
      const card = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const W = Math.min(QM.W, vw - 56);
      const from = { x: pen.left + pen.width / 2, y: pen.top + pen.height / 2 };
      const to = { x: card.left + card.width / 2, y: Math.min(vh - QM.H / 2 - 16, Math.max(from.y, 130)) };
      const n = Math.max(5, item.quantity) + 1;
      qm = {
        key: item.key, start: item.quantity, n, W, from, to,
        p: qmSpring(0), k: qmSpring(item.quantity), s: qmSpring(1),
        shown: -1, drag: null, closing: false, settled: false
      };
      const dots = Array.from({ length: n }, () => '<i></i>').join('');
      qmEl.dotsOff.innerHTML = dots;
      qmEl.dotsOn.innerHTML = dots;
      qmEl.pill.setAttribute('aria-valuemax', String(n - 1));
      qmEl.root.style.setProperty('--qm-y', to.y + 'px');
      qmEl.root.classList.remove('is-settled');
      qmEl.root.hidden = false;
      qtyOpenKey = item.key;
      line.classList.add('is-qty-open');
      qmShow(item.quantity, false);
      if (qmReduce.matches) qm.p.set(1);
      else qm.p.aim(1, 0.338, 0.822, 8.72);
      qmPaint();
      qmRun();
      // after the tapped label has clicked its switch (which may take focus)
      setTimeout(() => { if (qm && !qm.closing) qmEl.pill.focus({ preventScroll: true }); }, 0);
    };

    qmEl.hap.addEventListener('pointerdown', (e) => {
      if (!qm || qm.closing) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      qmEl.hap.setPointerCapture(e.pointerId);
      qm.drag = { id: e.pointerId, x0: e.clientX, moved: false };
      qm.s.aim(1.02, 0.2, 1);                        // puffs up under the finger
      qmRun();
    });
    qmEl.hap.addEventListener('pointermove', (e) => {
      const d = qm && qm.drag;
      if (!d || e.pointerId !== d.id) return;
      if (!d.moved && Math.abs(e.clientX - d.x0) < 4) return;
      d.moved = true;
      qm.k.aim(qmStopAt(e.clientX), 0.09, 1);        // the knob follows the finger
      qmShow(qmStop(qm.k.to), true);
      qmRun();
    });
    const qmRelease = (e) => {
      const d = qm && qm.drag;
      if (!d || e.pointerId !== d.id) return;
      qm.drag = null;
      const v = qmStop(d.moved ? qm.k.to : qmStopAt(e.clientX));   // a tap jumps to that stop
      qm.k.aim(v, 0.26, 0.86);
      qmShow(v, true);
      qm.s.aim(1, 0.32, 0.55);                       // settles back with a small bounce
      qmRun();
    };
    qmEl.hap.addEventListener('pointerup', qmRelease);
    qmEl.hap.addEventListener('pointercancel', qmRelease);

    /* iPhone ticks while dragging. When a real finger drags across a real
       switch, WebKit ticks each time the switch's thumb would cross its
       middle, no tap needed (CheckboxInputType::
       updateIsSwitchVisuallyOnFromAbsoluteLocation, iOS 18+). So while a
       finger drags, the invisible switch is moved under it with its middle
       100px to one side, and swapped to the other side each time the
       number changes: one tick per number.
       - WebKit only starts following a finger 200ms after it lands (a timer
         in CheckboxInputType::handleTouchEvent that a page can't shorten).
         So the numbers passed before then are owed, and play one after
         another, 30ms apart, as soon as it follows: a fast swipe still
         gets a tick for every number, the first few a moment late. Owed
         ticks are dropped once the finger has rested on one number for
         300ms.
       - If the finger lifts with ticks still owed, the switch is reset
         first so WebKit's click on lift ticks once more (after a drag that
         click is silent).
       - It's far wider than the screen because WebKit measures the first
         flip from where the switch was first ever touched, which has to
         stay clear of its right end.
       - A tap ticks when the finger lifts (WebKit clicks the switch). */
    const HAP = { W: 4000, H: 40, D: 100, FOLLOW: 205, GAP: 30, STALE: 300 };
    const hapPlace = (x, y) => {
      qmEl.hap.style.cssText = 'width:' + HAP.W + 'px;height:' + HAP.H + 'px;transform:translate(' +
        (x - HAP.W / 2 - qm.hapT.side * HAP.D) + 'px,' + (y - HAP.H / 2) + 'px)';
      qmEl.hap.getBoundingClientRect();              // lay it out now: WebKit reads it right after this listener
    };
    const hapTouch = (e) => Array.from(e.changedTouches).find((t) => qm && qm.hapT && t.identifier === qm.hapT.id);
    qmEl.hap.addEventListener('touchstart', (e) => {
      if (!qm || qm.closing || e.touches.length !== 1) return;
      const t = e.changedTouches[0];
      qmEl.hap.checked = false;                      // WebKit starts with the thumb on the left
      qm.hapT = { id: t.identifier, t0: performance.now(), side: -1, shown: qm.shown, owed: 0, at: 0, last: 0, flips: 0 };
      hapPlace(t.clientX, t.clientY);
    }, { passive: true });
    qmEl.hap.addEventListener('touchmove', (e) => {
      const t = hapTouch(e);
      if (!t) return;
      const h = qm.hapT;
      const now = performance.now();
      // the number under the finger, as the slider shows it (pointermove)
      const v = qm.drag && qm.drag.moved ? qmStop(qmStopAt(t.clientX)) : h.shown;
      if (v !== h.shown) { h.owed = Math.min(6, h.owed + Math.abs(v - h.shown)); h.shown = v; h.at = now; }
      if (h.owed && now - h.at > HAP.STALE) h.owed = 0;
      if (h.owed && now - h.t0 >= HAP.FOLLOW && now - h.last >= HAP.GAP) {   // WebKit is following the finger
        h.side = -h.side;
        h.owed--;
        h.last = now;
        h.flips++;
      }
      hapPlace(t.clientX, t.clientY);
    }, { passive: true });
    const hapEnd = (e) => {
      const h = hapTouch(e) && qm.hapT;
      if (!h) return;
      // ticks still owed: changing the switch from script stops WebKit's
      // tracking, so its click on lift ticks instead of staying silent
      if (e.type === 'touchend' && h.owed && h.flips && performance.now() - h.at <= HAP.STALE) {
        qmEl.hap.checked = !qmEl.hap.checked;
        qmEl.hap.checked = !qmEl.hap.checked;
      }
      qm.hapT = null;
      qmRun();
    };
    qmEl.hap.addEventListener('touchend', hapEnd);
    qmEl.hap.addEventListener('touchcancel', hapEnd);
    qmEl.pill.addEventListener('keydown', (e) => {
      if (!qm || qm.closing) return;
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (step) {
        e.preventDefault();
        const v = qmStop(qm.k.to + step);
        qm.k.aim(v, 0.26, 0.86);
        qmShow(v, true);
        qmRun();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closeQtyMenu();
      }
    });
    // anywhere but the pill closes it (and saves)
    qmEl.root.addEventListener('pointerdown', (e) => {
      if (e.target === qmEl.hap || qmEl.pill.contains(e.target)) return;
      e.preventDefault();
      closeQtyMenu();
    });
    // no page scrolling under it; touches on the switch are left to WebKit (cancelling them would stop its ticks)
    qmEl.root.addEventListener('touchmove', (e) => { if (e.target !== qmEl.hap && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && qm) { e.stopImmediatePropagation(); closeQtyMenu(); } }, true);

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

    /* On iPhone Safari (17.4+) the protection toggle is the native iOS
       switch, the phone's own control rather than a drawn copy. */
    if (protectToggle && 'switch' in protectToggle) {
      protectToggle.switch = true;
      protectToggle.parentNode.classList.add('is-native');
    }

    /* The card, styled after the iPhone's AirPods pop-up (theme-r2.css).
       Its swipe comes from the phone itself: the drawer is placed inside a
       full-screen scroll container (.drawer-scroller) whose two snap
       points are "closed" (the empty space above the card) and "open" (the
       card). Dragging, flicking or pulling the card is ordinary scrolling,
       so iOS/Android supply the finger tracking, momentum, rubber-band and
       where it comes to rest. Script adds the spring that pops it up, the
       slide away when it's closed by tapping, and the backdrop fade. */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    /* A spring described the way SwiftUI and UIKit describe theirs:
       response (seconds) and damping ratio (below 1 overshoots). Its curve
       is sampled into plain keyframes, which every browser can hand to the
       compositor (Core Animation on iPhone), so it runs off the main
       thread. */
    const spring = (response, damping, v0) => {  // v0: starting speed, in distances per second
      const w = (2 * Math.PI) / response;
      const k = damping * w;
      const wd = w * Math.sqrt(Math.max(0, 1 - damping * damping));
      const v = v0 || 0;
      const at = (t) => (wd
        ? 1 - Math.exp(-k * t) * (Math.cos(wd * t) + ((k - v) / wd) * Math.sin(wd * t))
        : 1 - Math.exp(-w * t) * (1 + (w - v) * t));
      const secs = Math.log(1000) / k;
      const pts = [];
      for (let i = 0; i < 64; i++) pts.push(at((secs * i) / 64));
      pts.push(1);
      return { pts, duration: Math.round(secs * 1000) };
    };
    const POP = spring(0.46, 0.78);                 // pops up with a little overshoot, like the AirPods card
    const AWAY = spring(0.36, 1);                   // leaves without bouncing
    const slide = (s, from, to, fill) => el.animate(
      s.pts.map((x, i) => ({ transform: 'translateY(' + (from + (to - from) * x).toFixed(2) + 'px)', offset: i / (s.pts.length - 1) })),
      { duration: s.duration, easing: 'linear', fill: fill || 'none' });
    const scroller = document.createElement('div');
    scroller.className = 'drawer-scroller';
    scroller.hidden = true;
    const space = document.createElement('div');
    space.className = 'drawer-scroller__space';
    space.setAttribute('aria-hidden', 'true');
    const end = document.createElement('div');
    end.className = 'drawer-scroller__end';
    end.setAttribute('aria-hidden', 'true');
    el.parentNode.insertBefore(scroller, el);
    scroller.appendChild(space);
    scroller.appendChild(el);
    scroller.appendChild(end);
    scrim.classList.add('is-sheet');
    el.tabIndex = -1;
    let isOpen = false;
    let closing = false;
    let restTimer = 0;
    let painting = false;
    let anims = [];
    const stopAnims = () => { anims.forEach((a) => a.cancel()); anims = []; };
    // Measured from the layout, not scrollHeight: while the card is
    // springing, its transform adds to the scrollable area.
    const maxTop = () => Math.max(0, end.offsetTop + end.offsetHeight - scroller.clientHeight);
    const paint = () => {
      painting = false;
      const m = maxTop();
      scrim.style.opacity = String(m ? Math.min(1, Math.max(0, scroller.scrollTop / m)) : 0);
    };
    const finishClose = () => {
      isOpen = false;
      closing = false;
      el.classList.remove('is-open');
      scroller.hidden = true;
      scrim.hidden = true;
      scrim.style.opacity = '';
      document.body.style.overflow = '';
      el.style.transform = '';
      stopAnims();
    };
    const atRest = () => { if (isOpen && !closing && scroller.scrollTop <= 1) finishClose(); };
    scroller.addEventListener('scroll', () => {
      if (!painting) { painting = true; requestAnimationFrame(paint); }
      clearTimeout(restTimer);
      restTimer = setTimeout(atRest, 120);
    }, { passive: true });
    const open = () => {
      if (closing) finishClose();                   // reopened while sliding away
      if (!isOpen) {
        isOpen = true;
        el.classList.add('is-open');
        scrim.hidden = false;
        scroller.hidden = false;
        document.body.style.overflow = 'hidden';
        scroller.scrollTop = maxTop();              // at rest, fully open…
        paint();
        if (el.animate) {                           // …and popped up from just below the screen
          const below = scroller.clientHeight - el.getBoundingClientRect().top;
          anims = reduceMotion.matches
            ? [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }),
              scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })]
            : [slide(POP, below, 0),
              scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' })];
        }
      } else if (scroller.scrollTop < maxTop() - 1) {
        scroller.scrollTo({ top: maxTop(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
      el.focus({ preventScroll: true });            // the card itself, so the X doesn't show a focus ring
    };
    const cardY = () => {
      const tf = getComputedStyle(el).transform;
      return tf && tf !== 'none' ? new DOMMatrix(tf).m42 : 0;
    };
    const close = (speed) => {                       // speed: px/ms the finger was moving down, after a swipe
      if (!isOpen || closing) return;
      if (!el.animate) { finishClose(); return; }
      closing = true;
      // Leave from exactly where the card is, even mid-pop or mid-swipe.
      const from = cardY();
      const to = scroller.clientHeight - el.getBoundingClientRect().top + from + 48;
      const fade = scrim.animate([{ opacity: getComputedStyle(scrim).opacity }, { opacity: 0 }],
        { duration: reduceMotion.matches ? 200 : 260, easing: 'ease-out', fill: 'forwards' });
      stopAnims();
      const v0 = typeof speed === 'number' && to > from ? Math.min(20, Math.max(0, (speed * 1000) / (to - from))) : 0;
      const away = reduceMotion.matches
        ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
        : slide(v0 ? spring(0.36, 1, v0) : AWAY, from, to, 'forwards');
      anims = [away, fade];
      away.onfinish = () => { if (closing) finishClose(); };
    };
    space.addEventListener('click', close);          // tap outside the sheet

    /* Swiping the card down on a phone is tracked here, from the first
       touch, so that once it's past halfway it is committed to closing and
       can't be pulled back up. (Taking over the phone's own scrolling part
       way through a swipe makes Safari jump, so the swipe is never handed to
       it.) Lists inside the card that scroll still scroll natively. */
    const SNAP = spring(0.38, 0.86);                 // springs back when let go before halfway
    let drag = null;
    const place = (y) => {
      el.style.transform = 'translateY(' + y.toFixed(2) + 'px)';
      scrim.style.opacity = String(Math.min(1, Math.max(0, 1 - y / el.offsetHeight)));
    };
    scroller.addEventListener('touchstart', (e) => {
      drag = null;
      if (!isOpen || closing || e.touches.length > 1) return;
      const t = e.touches[0];
      const list = e.target.closest && e.target.closest('.drawer__body');
      drag = {
        x: t.clientX, y: t.clientY, mode: 0, base: 0, cur: 0, peak: 0, locked: false, pts: [],
        list: list && list.scrollHeight > list.clientHeight + 1 ? list : null
      };
    }, { passive: true });
    scroller.addEventListener('touchmove', (e) => {
      if (!drag) { if (isOpen && e.cancelable) e.preventDefault(); return; }
      if (drag.mode < 0) return;                     // scrolling the list inside the card
      const t = e.touches[0];
      const dy = t.clientY - drag.y;
      if (drag.mode === 0) {
        if (dy === 0 && t.clientX === drag.x) return;
        if (drag.list && (drag.list.scrollTop > 0 || dy < 0)) { drag.mode = -1; return; }
        drag.mode = 1;
        drag.base = cardY();                         // catch it where it is, even mid-pop
        stopAnims();
      }
      if (e.cancelable) e.preventDefault();
      const h = el.offsetHeight;
      let y = drag.base + dy;
      if (y < 0) y = -(1 - 1 / ((-y * 0.55) / h + 1)) * h;   // rubber-band above the resting place, like iOS
      if (drag.locked) y = Math.max(y, drag.peak);   // past halfway: it can only go further down
      drag.peak = Math.max(drag.peak, y);
      if (drag.peak > h / 2) drag.locked = true;
      drag.cur = y;
      place(y);
      drag.pts.push({ t: e.timeStamp, y: t.clientY });
      while (drag.pts.length > 2 && e.timeStamp - drag.pts[0].t > 100) drag.pts.shift();
    }, { passive: false });
    const release = () => {
      const d = drag;
      drag = null;
      if (!d || d.mode !== 1 || !isOpen || closing) return;
      const a = d.pts[0];
      const b = d.pts[d.pts.length - 1];
      const speed = a && b && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;   // px/ms, down is positive
      if (d.locked || d.cur > el.offsetHeight / 2 || (speed > 0.5 && d.cur > 0)) { close(speed); return; }
      el.style.transform = '';
      scrim.style.opacity = '1';
      if (Math.abs(d.cur) < 0.5 || !el.animate) return;
      const v0 = Math.min(20, Math.max(-20, (speed * 1000) / -d.cur));
      anims = [slide(v0 ? spring(0.38, 0.86, v0) : SNAP, d.cur, 0),
        scrim.animate([{ opacity: Math.min(1, Math.max(0, 1 - d.cur / el.offsetHeight)) }, { opacity: 1 }],
          { duration: 300, easing: 'ease-out' })];
    };
    scroller.addEventListener('touchend', release);
    scroller.addEventListener('touchcancel', release);
    const refresh = (openAfter) => fetchJSON('/cart.js').then((c) => { cart = c; render(); if (openAfter) open(); });

    $$('[data-cart-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); refresh(true); }));
    $('[data-drawer-close]', el).addEventListener('click', close);
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });

    refresh(false);
    return { refresh, open, close };
  })();

})();
