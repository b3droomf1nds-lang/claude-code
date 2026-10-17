/* ============================================================
   VOLTICAL — voltical-usage-calc.js
   Drives the standalone "Usage calculator" page: a grid of every
   product (rendered in Liquid) + one shared results panel. Click
   a product card to load its calculator into the panel, using the
   same spec data (window.VolticalData) as the product-page one.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var root = document.querySelector('[data-ucalc-root]');
  var grid = document.querySelector('[data-ucalc-grid]');
  var panel = document.querySelector('[data-ucalc-panel]');
  var backBtn = document.querySelector('[data-ucalc-back]');
  if (!root || !grid || !panel || !window.VolticalData) return;

  var D = window.VolticalData;
  var S = window.VolticalUsageStrings || {};
  var cards = $$('[data-ucalc-card]', grid);

  var titleEl = $('[data-ucalc-title]', panel);
  var deviceImgEl = $('[data-ucalc-device-img]', panel);
  var deviceMetaEl = $('[data-ucalc-device-meta]', panel);
  var badgeEl = $('[data-ucalc-badge]', panel);
  var capsWrap = $('[data-ucalc-caps]', panel);
  var selMainWrap = $('[data-ucalc-sel-main-wrap]', panel);
  var selMainLabel = $('[data-ucalc-sel-main-label]', panel);
  var selMain = $('[data-ucalc-sel-main]', panel);
  var selWatchWrap = $('[data-ucalc-sel-watch-wrap]', panel);
  var selWatch = $('[data-ucalc-sel-watch]', panel);
  var out = $('[data-ucalc-out]', panel);
  var meter = $('[data-ucalc-meter] i', panel);
  var f1 = $('[data-ucalc-f1]', panel);
  var f1Label = $('[data-ucalc-f1-label]', panel);
  var f2 = $('[data-ucalc-f2]', panel);
  var f2Label = $('[data-ucalc-f2-label]', panel);
  var f3 = $('[data-ucalc-f3]', panel);
  var f3Label = $('[data-ucalc-f3-label]', panel);
  var note = $('[data-ucalc-note]', panel);

  var fill = function (sel, list) {
    sel.innerHTML = '<option value="" selected disabled>' + (S.placeholder || 'Select your device') + '</option>';
    list.forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.mah; o.textContent = d.name; o.dataset.hours = d.hours || '';
      sel.appendChild(o);
    });
  };

  var t2080 = function (mah, watts, delivered) {
    return Math.round(((mah * 0.6 * 3.85) / 1000 / (watts * delivered)) * 60 * 1.05);
  };
  var fmt = function (mins) {
    return mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min';
  };
  var iphoneMaxW = function (name) {
    return /pro max/i.test(name) ? 27 : 20;
  };

  var state = { handle: null, capacity: null };

  var reset = function () {
    out.classList.remove('is-live');
    [f1, f2, f3].forEach(function (f) { f.innerHTML = '—'; });
    if (meter) meter.style.transform = 'scaleX(0)';
  };

  var fillMeter = function () {
    if (!meter) return;
    /* force the browser to commit the scaleX(0) from reset() before
       flipping to scaleX(1), so the fill transition actually plays
       every time instead of jumping straight to full. setTimeout (not
       rAF) so this still runs even if the tab/page isn't actively
       painting when the value changes. */
    meter.style.transform = 'scaleX(0)';
    void meter.offsetWidth;
    setTimeout(function () {
      meter.style.transform = 'scaleX(1)';
    }, 20);
  };

  var run = function () {
    var spec = D.products[state.handle];
    if (!spec) return;
    reset();

    if (spec.type === 'powerbank') {
      var mah = Number(selMain.value);
      if (!mah || !state.capacity) return;
      var usableWireless = state.capacity * D.efficiency.wireless;
      var usableWired = state.capacity * D.efficiency.wired;
      f1Label.textContent = S.wireless_charges || 'Full charges · magnetic';
      f2Label.textContent = S.time_2080 || '20→80% · magnetic';
      f3Label.textContent = S.wired_charges || 'Full charges · USB-C';
      f1.innerHTML = '≈ <b>' + (usableWireless / mah).toFixed(1) + '×</b>';
      f2.innerHTML = '≈ <b>' + fmt(t2080(mah, spec.wirelessW, 0.7)) + '</b>';
      f3.innerHTML = '≈ <b>' + (usableWired / mah).toFixed(1) + '×</b>';
      out.classList.add('is-live');
      fillMeter();

    } else if (spec.type === 'watchcase') {
      var wmah = Number(selMain.value);
      if (!wmah) return;
      var usable = spec.capacities.default * D.efficiency.wireless;
      var charges = usable / wmah;
      var hours = (selMain.selectedOptions[0].dataset.hours || 18) * charges;
      f1Label.textContent = S.full_charges || 'Full recharges';
      f2Label.textContent = S.extra_hours || 'Extra runtime';
      f3Label.textContent = S.output || 'Charging output';
      f1.innerHTML = '≈ <b>' + charges.toFixed(1) + '×</b>';
      f2.innerHTML = '≈ <b>+' + Math.round(hours) + ' h</b>';
      f3.innerHTML = '<b>' + spec.wirelessW + ' W</b>';
      out.classList.add('is-live');
      fillMeter();

    } else if (spec.type === 'charger') {
      var pmah = Number(selMain.value) || 0;
      var wm = selWatch ? (Number(selWatch.value) || 0) : 0;
      if (!pmah && !wm) return;
      f1Label.textContent = S.phone_2080 || 'iPhone · 20→80%';
      f2Label.textContent = S.watch_2080 || 'Watch · 20→80%';
      f3Label.textContent = S.output || 'Charging output';
      var phoneMins = pmah ? t2080(pmah, spec.wirelessW, 0.7) : 0;
      f1.innerHTML = pmah ? '≈ <b>' + fmt(phoneMins) + '</b>' : '—';
      f2.innerHTML = wm ? '≈ <b>' + fmt(t2080(wm, spec.watchW || 2.5, 0.6)) + '</b>' : '—';
      f3.innerHTML = '<b>' + spec.wirelessW + ' W</b>';
      out.classList.add('is-live');
      fillMeter();

    } else if (spec.type === 'cable') {
      var cmah = Number(selMain.value);
      if (!cmah) return;
      var deviceName = selMain.selectedOptions[0].textContent;
      var capW = Math.min(spec.cableMaxW, iphoneMaxW(deviceName));
      f1Label.textContent = S.cable_2080 || 'iPhone · 20→80%';
      f2Label.textContent = S.cable_output || 'Adapter needed';
      f3Label.textContent = '';
      f1.innerHTML = '≈ <b>' + fmt(t2080(cmah, capW, 0.82)) + '</b>';
      f2.innerHTML = '<b>' + capW + ' W</b>';
      f3.innerHTML = '';
      out.classList.add('is-live');
      fillMeter();

    } else if (spec.type === 'watchcable') {
      var wcmah = Number(selMain.value);
      var wcName = selMain.selectedOptions[0] ? selMain.selectedOptions[0].textContent : '';
      if (!wcmah) return;
      var isFast = spec.fastModels.some(function (m) { return wcName.indexOf(m) !== -1; });
      var mins = (spec.fastAnchorMins * (wcmah / spec.fastAnchorMah)) * (isFast ? 1 : 2);
      f1Label.textContent = S.watchcable_2080 || 'Watch · 0→80%';
      f2Label.textContent = S.watchcable_output || 'Charge mode';
      f3Label.textContent = '';
      f1.innerHTML = '≈ <b>' + fmt(Math.round(mins)) + '</b>';
      f2.innerHTML = '<b>' + (isFast ? 'Fast charge' : 'Standard') + '</b>';
      f3.innerHTML = '';
      out.classList.add('is-live');
      fillMeter();
    }
  };

  var selectCard = function (card) {
    cards.forEach(function (c) { c.classList.remove('is-active'); });
    card.classList.add('is-active');
    var handle = card.dataset.handle;
    var spec = D.products[handle];
    state.handle = handle;
    state.capacity = null;
    reset();

    if (!spec) {
      root.classList.remove('is-device');
      return;
    }
    root.classList.add('is-device');
    titleEl.textContent = card.dataset.title || spec.label;
    if (deviceImgEl) {
      var imgSrc = card.dataset.image;
      if (imgSrc) {
        deviceImgEl.src = imgSrc;
        deviceImgEl.alt = card.dataset.title || spec.label;
        deviceImgEl.hidden = false;
      } else {
        deviceImgEl.hidden = true;
      }
    }
    if (deviceMetaEl) {
      var metaEl = $('.product-card__meta', card);
      deviceMetaEl.textContent = metaEl ? metaEl.textContent : '';
    }
    badgeEl.textContent = spec.estimated ? (S.badge || 'Estimate') : (S.badge || 'Estimate');

    /* Capacity picker (Core / Core Pro only) */
    capsWrap.innerHTML = '';
    if (spec.capacities && spec.type === 'powerbank') {
      capsWrap.hidden = false;
      Object.keys(spec.capacities).forEach(function (key, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ucalc-cap' + (i === Object.keys(spec.capacities).length - 1 ? ' is-selected' : '');
        btn.textContent = Number(key).toLocaleString() + ' mAh';
        btn.addEventListener('click', function () {
          $$('.ucalc-cap', capsWrap).forEach(function (b) { b.classList.remove('is-selected'); });
          btn.classList.add('is-selected');
          state.capacity = spec.capacities[key];
          run();
        });
        capsWrap.appendChild(btn);
      });
      var keys = Object.keys(spec.capacities);
      state.capacity = spec.capacities[keys[keys.length - 1]];
    } else {
      capsWrap.hidden = true;
    }

    /* Main device select */
    selMainWrap.hidden = false;
    if (spec.type === 'watchcase' || spec.type === 'watchcable') {
      selMainLabel.textContent = S.select_watch || 'Your Apple Watch';
      fill(selMain, D.watches);
    } else if (spec.type === 'charger') {
      selMainLabel.textContent = S.select_iphone || 'Your iPhone';
      fill(selMain, D.iphones);
    } else if (spec.type === 'cable') {
      selMainLabel.textContent = S.select_device || 'Your iPhone';
      fill(selMain, D.iphones);
    } else {
      selMainLabel.textContent = S.select_iphone || 'Your iPhone';
      fill(selMain, D.iphones);
    }

    /* Secondary watch select (Puck only) */
    if (spec.type === 'charger') {
      selWatchWrap.hidden = false;
      fill(selWatch, D.watches);
    } else {
      selWatchWrap.hidden = true;
    }

    /* let the grow-in animation actually start before the page scrolls,
       so it reads as one smooth motion instead of a hard jump followed
       by a separate expand. */
    setTimeout(function () {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  var goBack = function () {
    root.classList.remove('is-device');
    cards.forEach(function (c) { c.classList.remove('is-active'); });
    setTimeout(function () {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  cards.forEach(function (card) {
    card.addEventListener('click', function () { selectCard(card); });
  });
  if (backBtn) backBtn.addEventListener('click', goBack);
  selMain.addEventListener('change', run);
  if (selWatch) selWatch.addEventListener('change', run);
})();
