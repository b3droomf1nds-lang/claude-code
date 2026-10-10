/* ============================================================
   VOLTICAL — voltical-calc.js
   Capacity & speed calculator (v2). Replaces the calc module in
   theme.js (which binds to [data-calc]; this binds to
   [data-calc-v2], so the old module no-ops).

   Modes:
   - powerbank  : full charges (magnetic + wired) + 20→80% time
   - watchcase  : full recharges + extra hours + output
   - charger    : (Puck) iPhone 20→80% + Watch 20→80% + output
   - cable      : (USB-C Cable) iPhone 20→80% on a standard adapter,
                  recommended adapter wattage, and — where the phone
                  actually supports it — the faster time a higher-
                  wattage "fancy" USB-C PD/PPS brick gets you over
                  part of the charge.
   - watchcable : (Watch Charge Cable) Watch 0→80% time, scaled from
                  a supplier-tested anchor figure; models without the
                  fast-charge chipset (e.g. SE) charge slower.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var calc = document.querySelector('[data-calc-v2]');
  if (!calc || !window.VolticalData) return;

  var D = window.VolticalData;
  var spec = D.products[calc.dataset.handle];
  if (!spec) return;

  var out = $('[data-calc-out]', calc);
  var meter = $('[data-calc-meter] i', calc);
  var f1 = $('[data-calc-charges]', calc);
  var f2 = $('[data-calc-speed]', calc);
  var f3 = $('[data-calc-third]', calc);
  var selMain = $('[data-calc-device]', calc);
  var selWatch = $('[data-calc-device-watch]', calc);

  var fill = function (sel, list) {
    list.forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.mah; o.textContent = d.name;
      if (d.hours) o.dataset.hours = d.hours;
      if (d.stdW) o.dataset.stdw = d.stdW;
      if (d.fastW) o.dataset.fastw = d.fastW;
      sel.appendChild(o);
    });
  };

  if (spec.type === 'watchcase' || spec.type === 'watchcable') fill(selMain, D.watches);
  else if (spec.type === 'cable') fill(selMain, D.iphonesUsbc);
  else fill(selMain, D.iphones);
  if (selWatch) fill(selWatch, D.watches);

  /* 20→80% time in minutes: 60% of the battery, charged in the fast
     band (no deep taper), small handshake/thermal overhead. */
  var t2080 = function (mah, watts, delivered) {
    return Math.round(((mah * 0.6 * 3.85) / 1000 / (watts * delivered)) * 60 * 1.05);
  };
  var fmt = function (mins) {
    return mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min';
  };

  var caps = spec.capacities ? Object.values(spec.capacities) : [];
  var currentCapacity = caps.length ? caps[caps.length - 1] : 0;

  window.VolticalCalcSetCapacity = function (optText) {
    if (!spec.capacities) return;
    var n = String(optText).replace(/[^0-9]/g, '');
    var key = Object.keys(spec.capacities).find(function (k) {
      return n.indexOf(k) === 0 || n === k;
    });
    if (key) { currentCapacity = spec.capacities[key]; run(); }
  };

  var run = function () {
    var mah = Number(selMain.value);

    if (spec.type === 'charger') {
      var wmah = selWatch ? Number(selWatch.value) : 0;
      if (!mah && !wmah) return;
      out.classList.add('is-live');
      var phoneMins = mah ? t2080(mah, spec.wirelessW, 0.7) : 0;
      f1.innerHTML = mah ? '≈ <b>' + fmt(phoneMins) + '</b>' : '—';
      f2.innerHTML = wmah ? '≈ <b>' + fmt(t2080(wmah, spec.watchW || 2.5, 0.6)) + '</b>' : '—';
      f3.innerHTML = '<b>' + spec.wirelessW + ' W</b>';
      if (meter) meter.style.transform = 'scaleX(' + (phoneMins ? Math.min(55 / phoneMins, 1) : 0.4) + ')';
      return;
    }

    if (spec.type === 'cable') {
      if (!mah) return;
      out.classList.add('is-live');
      var opt = selMain.selectedOptions[0];
      var stdW = Number(opt.dataset.stdw || 20);
      var fastW = Number(opt.dataset.fastw || stdW);
      var effStd = Math.min(spec.cableMaxW, stdW);
      var stdMins = t2080(mah, effStd, D.efficiency.wired);
      f1.innerHTML = '≈ <b>' + fmt(stdMins) + '</b>';
      f2.innerHTML = '<b>' + stdW + ' W+</b>';
      if (fastW > stdW) {
        var effFast = Math.min(spec.cableMaxW, fastW);
        var fastMins = t2080(mah, effFast, D.efficiency.wired);
        f3.innerHTML = '≈ <b>' + fmt(fastMins) + '</b> <span class="t-mono" style="opacity:.6;font-size:.8em">@ ' + fastW + ' W</span>';
      } else {
        f3.innerHTML = '<b>No faster</b>';
      }
      if (meter) meter.style.transform = 'scaleX(' + Math.min(55 / stdMins, 1) + ')';
      return;
    }

    if (spec.type === 'watchcable') {
      if (!mah) return;
      out.classList.add('is-live');
      var wOpt = selMain.selectedOptions[0];
      var wName = wOpt.textContent;
      var isFast = spec.fastModels.some(function (tag) { return wName.indexOf(tag) !== -1; });
      var scaled = spec.fastAnchorMins * (mah / spec.fastAnchorMah);
      if (!isFast) scaled *= 2;
      scaled = Math.round(scaled);
      f1.innerHTML = '≈ <b>' + fmt(scaled) + '</b>';
      f2.innerHTML = '<b>' + (isFast ? 'Fast charge' : 'Standard charge') + '</b>';
      f3.innerHTML = '<b>20 W</b>';
      if (meter) meter.style.transform = 'scaleX(' + Math.min(75 / scaled, 1) + ')';
      return;
    }

    if (!mah) return;
    out.classList.add('is-live');
    var usable = currentCapacity * D.efficiency.wireless;
    var usableWired = currentCapacity * D.efficiency.wired;

    if (spec.type === 'watchcase') {
      var charges = usable / mah;
      var hours = (selMain.selectedOptions[0].dataset.hours || 18) * charges;
      f1.innerHTML = '≈ <b>' + charges.toFixed(1) + '×</b>';
      f2.innerHTML = '≈ <b>+' + Math.round(hours) + ' h</b>';
      f3.innerHTML = '<b>' + spec.wirelessW + ' W</b>';
      if (meter) meter.style.transform = 'scaleX(' + Math.min(charges / 3, 1) + ')';
    } else {
      var charges2 = usable / mah;
      var chargesWired = usableWired / mah;
      var mins = t2080(mah, spec.wirelessW, 0.7);
      f1.innerHTML = '≈ <b>' + charges2.toFixed(1) + '×</b>';
      f2.innerHTML = '≈ <b>' + fmt(mins) + '</b>';
      f3.innerHTML = '≈ <b>' + chargesWired.toFixed(1) + '×</b>';
      if (meter) meter.style.transform = 'scaleX(' + Math.min(charges2 / 3, 1) + ')';
    }
  };

  selMain.addEventListener('change', run);
  if (selWatch) selWatch.addEventListener('change', run);
})();
