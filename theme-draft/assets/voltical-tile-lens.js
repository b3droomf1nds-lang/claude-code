/* Liquid Glass edge on the Core page's compare tiles.

   Each tile's edge bends what's inside the tile near it, all the way
   round, the way the cart sheet's edge bends the page under it: the same
   iOS clear-glass profile, measured off the Notification Centre sheet
   (docs/liquid-glass-lens.md, section 1). Within 31.4px of the rim the tile
   shows itself from further in: stretched more and more towards a fold
   12.4px in, then mirrored out to the rim, with red drawn from deeper and
   blue from shallower in the last few pixels (colour fringes wherever
   something passes under the rim), and the rim's last 5px hazed towards
   the tile's own colour. Round the corners it follows the arc.

   The tiles bend themselves, so no copies of the page are needed (the cart
   needs them because Safari can't bend what's behind an element): each
   tile gets an SVG displacement filter whose maps, drawn here once per tile
   size, hold how far and which way every pixel of the rim looks inwards.
   Inside the band the tile is drawn as it is, untouched.

   The filter goes on once a tile has finished revealing (its picture eases
   in), so it's worked out once, not every frame, and comes off in Canva
   edit mode. Off with "reduce transparency". */
(function () {
  'use strict';
  var tiles = [].slice.call(document.querySelectorAll('.pdp--core .pdp-cmp__grid > .pdp-cmp__card'));
  if (!tiles.length || !document.createElementNS) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-transparency: reduce)').matches) return;

  // The clear sheet's profile (as the cart's lens, theme-r3.js): the band px d in from the rim
  // shows the tile at depth at(d), per colour; flat (1:1) from B in.
  var B = 31.41;
  var at = function (d, c) {
    var s = d + 26.14 * Math.pow(Math.max(0, 1 - d / B), 2.251);
    if (c === 0) s += 12.65 * Math.pow(Math.max(0, 1 - d / 6.1), 2.29);        // red, from deeper
    else if (c === 2) s -= 11.28 * Math.pow(Math.max(0, 1 - d / 9.07), 3.98);  // blue, from shallower
    return s;
  };
  // the rim's haze: how much of the tile's own colour covers it, d px in (as the cart's)
  var HAZE = [[0, 0.66], [0.67, 0.56], [1.5, 0.47], [2, 0.4], [3, 0.17], [4, 0.08], [5, 0]];
  var haze = function (d) {
    for (var i = 1; i < HAZE.length; i++) {
      if (d <= HAZE[i][0]) {
        var a = HAZE[i - 1], b = HAZE[i];
        return a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]);
      }
    }
    return 0;
  };
  // each colour's displacement map spans ±S/2 px: S a little over twice its furthest reach
  var S = [0, 1, 2].map(function (c) {
    var most = 0;
    for (var d = 0; d <= B; d += 0.05) most = Math.max(most, Math.abs(at(d, c) - d));
    return Math.ceil(most * 2.1);
  });
  // the same as tables every 1/32px, read per map pixel: how far each colour looks in (as a share
  // of its map's span), and the haze
  var STEP = 32, N = Math.ceil(B * STEP) + 1;
  var REACH = [0, 1, 2].map(function (c) {
    var t = new Float32Array(N);
    for (var n = 0; n < N; n++) t[n] = (at(n / STEP, c) - n / STEP) / S[c];
    return t;
  });
  var HZ = new Float32Array(N);
  for (var n = 0; n < N; n++) HZ[n] = haze(n / STEP);

  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  // not display:none: Safari draws nothing through a filter that lives in an undisplayed svg
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  var defs = document.createElementNS(NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  var el = function (name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // The maps for a tile w × h screen px with corners of radius r, one map pixel per screen px:
  // for each colour, R and G hold how far x and y look inwards (0.5 = not at all), alpha marks
  // the band; then the haze, in the tile's colour.
  var draw = function (w, h, r, bg) {
    var data = [0, 1, 2, 3].map(function () { return new Uint8ClampedArray(w * h * 4); });
    for (var j = 0; j < h; j++) {
      var y = j + 0.5, qy = Math.min(y, h - y);
      for (var i = 0; i < w; i++) {
        var x = i + 0.5, qx = Math.min(x, w - x);
        if (qx >= B && qy >= B) { i = Math.max(i, Math.floor(w - B) - 1); continue; }   // the middle: on to the right side's band
        var d, nx = 0, ny = 0;
        if (qx < r && qy < r) {                      // a corner: along the arc's radius, inwards
          var cx = x < r ? r : w - r, cy = y < r ? r : h - r;
          var vx = cx - x, vy = cy - y, rho = Math.sqrt(vx * vx + vy * vy);
          d = r - rho;
          if (rho > 1e-6) { nx = vx / rho; ny = vy / rho; }
        } else if (qx < qy) { d = qx; nx = x < w / 2 ? 1 : -1; }
        else { d = qy; ny = y < h / 2 ? 1 : -1; }
        d = Math.max(0, d);
        if (d >= B) continue;
        var o = (j * w + i) * 4, n = Math.round(d * STEP);
        for (var c = 0; c < 3; c++) {
          var reach = REACH[c][n], m = data[c];
          m[o] = Math.round((0.5 + nx * reach) * 255);
          m[o + 1] = Math.round((0.5 + ny * reach) * 255);
          m[o + 3] = 255;
        }
        var hz = HZ[n];
        if (hz > 0) { var z = data[3]; z[o] = bg[0]; z[o + 1] = bg[1]; z[o + 2] = bg[2]; z[o + 3] = Math.round(hz * 255); }
      }
    }
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var cx2 = canvas.getContext('2d');
    return data.map(function (px) {
      cx2.clearRect(0, 0, w, h);
      cx2.putImageData(new ImageData(px, w, h), 0, 0);
      return canvas.toDataURL('image/png');
    });
  };

  // One filter per tile size. Within the band: the tile looked up three times, once per colour
  // map, each copy keeping its own channel (the others screened to white, then multiplied back
  // together), the haze over that, all cut to the band and the tile's own shape; over the tile
  // as it is. Until its maps load the band is empty, so the tile shows as it is.
  var filters = {};
  var filterFor = function (key, W, H, k, w, h, r, bg) {
    if (filters[key]) return filters[key];
    var urls = draw(w, h, r, bg);
    var id = 'vtl-' + Object.keys(filters).length;
    var f = el('filter', { id: id, x: 0, y: 0, width: W, height: H, filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, defs);
    var names = ['r', 'g', 'b', 'hz'];
    urls.forEach(function (u, n) {
      var im = el('feImage', { x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none', result: 'm' + names[n] }, f);
      im.setAttribute('href', u);
      im.setAttributeNS(XL, 'xlink:href', u);
    });
    var keep = [
      '1 0 0 0 0  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0',
      '0 0 0 0 1  0 1 0 0 0  0 0 0 0 1  0 0 0 1 0',
      '0 0 0 0 1  0 0 0 0 1  0 0 1 0 0  0 0 0 1 0'
    ];
    [0, 1, 2].forEach(function (c) {
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'm' + names[c], scale: (S[c] / k).toFixed(4),
        xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + names[c] }, f);
      el('feColorMatrix', { in: 'd' + names[c], type: 'matrix', values: keep[c], result: 'k' + names[c] }, f);
    });
    el('feBlend', { in: 'kr', in2: 'kg', mode: 'multiply', result: 'rg' }, f);
    el('feBlend', { in: 'rg', in2: 'kb', mode: 'multiply', result: 'rgb' }, f);
    el('feComposite', { in: 'mhz', in2: 'rgb', operator: 'over', result: 'lit' }, f);
    el('feComposite', { in: 'lit', in2: 'mg', operator: 'in', result: 'band' }, f);
    el('feComposite', { in: 'band', in2: 'SourceAlpha', operator: 'in', result: 'rim' }, f);
    el('feComposite', { in: 'rim', in2: 'SourceGraphic', operator: 'over' }, f);
    // ready once the maps have decoded, so a tile never shows a half-loaded filter
    var ready = Promise.all(urls.map(function (u) {
      var img = new Image();
      img.src = u;
      return img.decode ? img.decode().catch(function () {}) : new Promise(function (ok) { img.onload = img.onerror = ok; });
    }));
    filters[key] = { id: id, ready: ready };
    return filters[key];
  };

  var editing = function () { return document.documentElement.classList.contains('cv-editing'); };
  var rgb = function (s) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  };
  // a tile is settled once it's revealed and nothing in it is moving
  var settled = function (t) {
    if (!t.offsetWidth) return null;
    var moving = t.getAnimations ? t.getAnimations({ subtree: true }).filter(function (a) { return a.playState !== 'finished' && a.playState !== 'idle'; }) : [];
    if (moving.length) return Promise.all(moving.map(function (a) { return a.finished.catch(function () {}); }));
    return getComputedStyle(t).opacity === '0' ? null : true;
  };
  var fit = function (t) {
    if (editing()) { t.style.filter = t.style.willChange = ''; t.__vtl = ''; return; }
    var s = settled(t);
    if (s === null) return;                          // not shown (yet): the class change brings it back
    if (s !== true) { s.then(function () { fit(t); }); return; }
    var W = t.offsetWidth, H = t.offsetHeight;
    var k = t.getBoundingClientRect().width / W;     // screen px per tile px (the desktop grid is scaled)
    if (!(k > 0)) return;
    var cs = getComputedStyle(t);
    var w = Math.round(W * k), h = Math.round(H * k);
    var r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, W / 2, H / 2) * k;
    var bg = rgb(cs.backgroundColor);
    var key = [W, H, k.toFixed(3), r.toFixed(1), bg.join()].join('/');
    if (t.__vtl === key) return;
    t.__vtl = key;
    var f = filterFor(key, W, H, k, w, h, r, bg);
    // its own layer: the phone works the filter out once and then only moves the tile as the page
    // scrolls, rather than again for every patch of the page it redraws
    f.ready.then(function () {
      if (t.__vtl !== key || editing()) return;
      t.style.willChange = 'transform';
      t.style.filter = 'url(#' + f.id + ')';
    });
  };

  // one tile at a time, a frame apart, so drawing the maps never holds up a frame for long
  var queue = [], busy = false;
  var later = function (t) {
    if (queue.indexOf(t) < 0) queue.push(t);
    if (busy) return;
    busy = true;
    var next = function () {
      var t2 = queue.shift();
      if (!t2) { busy = false; return; }
      fit(t2);
      (window.requestIdleCallback || requestAnimationFrame)(next);
    };
    requestAnimationFrame(next);
  };
  var all = function () { tiles.forEach(later); };

  // revealed (or hidden) tiles, and Canva edit mode switching on or off
  var watch = new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.target === document.documentElement) all();
      else later(m.target);
    });
  });
  tiles.forEach(function (t) { watch.observe(t, { attributes: true, attributeFilter: ['class'] }); });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  // a new size (a turned phone, a wider window, across the phone/desktop line)
  var resized = 0;
  addEventListener('resize', function () { clearTimeout(resized); resized = setTimeout(all, 200); });
  if (document.readyState === 'complete') all(); else addEventListener('load', all, { once: true });
})();
