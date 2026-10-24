/* Liquid Glass edge on the Core page's compare tiles.

   Each tile's edge bends what's inside the tile near it, all the way
   round, the way the cart sheet's edge bends the page under it: the same
   iOS clear-glass profile, measured off the Notification Centre sheet
   (docs/liquid-glass-lens.md, section 1). Within 31.4px of the rim the tile
   shows itself from further in: stretched more and more towards a fold
   12.4px in, then mirrored out to the rim, and the rim's last 5px hazed
   towards the tile's own colour. Round the corners it follows the arc.
   Without the sheet's colour split (red drawn from deeper, blue from
   shallower): on a tile that sits still, a dark line about 39px in left
   a standing cyan line at the rim, which the owner saw as blue artifacts.
   Over it all, the cart's bright rim: a 1px white line at the very edge,
   with a faint shade just inside so it shows on a white tile.

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

  // The clear sheet's profile (the cart lens's green, theme-r3.js): the band px d in from the rim
  // shows the tile at depth at(d); flat (1:1) from B in.
  var B = 31.41;
  var at = function (d) { return d + 26.14 * Math.pow(Math.max(0, 1 - d / B), 2.251); };
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
  // the displacement map spans ±S/2 px: S a little over twice the furthest it looks in
  var S = 0;
  for (var d = 0; d <= B; d += 0.05) S = Math.max(S, at(d) - d);
  S = Math.ceil(S * 2.1);
  // the bright rim, as round the cart's bubbles (theme-r2.css): white over the last px; on a white
  // tile white alone can't show, so a faint shade just inside it, fading out 3px in, sets it off
  var LINE = 1, LIT = 0.95, SHADE = 0.07, SHADE_TO = 3;
  // the same as tables every 1/32px, read per map pixel: how far it looks in (as a share of the
  // map's span), and the haze
  var STEP = 32, N = Math.ceil(B * STEP) + 1;
  var REACH = new Float32Array(N);
  for (var n = 0; n < N; n++) REACH[n] = (at(n / STEP) - n / STEP) / S;
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

  // Whether the point x, y lies left of the middle, clear of a band b px wide (and of the corners'
  // arcs, which can reach further in): if so, how far in from the right the band starts again on
  // its row (else 0).
  var inner = function (x, y, w, h, r, b) {
    var to = Math.min(y, h - y) < r ? Math.max(r, b) : b;
    return x >= to && x < w / 2 && Math.min(y, h - y) >= b ? to : 0;
  };

  // The maps for a tile w × h screen px with corners of radius r, one map pixel per screen px:
  // R and G hold how far x and y look inwards (0.5 = not at all), alpha marks the band; then the
  // haze, in the tile's colour.
  var draw = function (w, h, r, bg) {
    var data = [0, 1].map(function () { return new Uint8ClampedArray(w * h * 4); });
    for (var j = 0; j < h; j++) {
      var y = j + 0.5, qy = Math.min(y, h - y);
      for (var i = 0; i < w; i++) {
        var x = i + 0.5, qx = Math.min(x, w - x);
        var to = inner(x, y, w, h, r, B);
        if (to) { i = Math.max(i, Math.floor(w - to) - 1); continue; }   // the middle: on to the right side's band
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
        var reach = REACH[n], m = data[0];
        m[o] = Math.round((0.5 + nx * reach) * 255);
        m[o + 1] = Math.round((0.5 + ny * reach) * 255);
        m[o + 3] = 255;
        var hz = HZ[n];
        if (hz > 0) { var z = data[1]; z[o] = bg[0]; z[o + 1] = bg[1]; z[o + 2] = bg[2]; z[o + 3] = Math.round(hz * 255); }
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
  // The rim for the same tile, q device pixels per screen px so it stays a sharp line on the
  // phone: rings concentric with the edge (a corner of radius r - d at d in). Only its outer T px
  // hold anything, so it's four strips, top and bottom (with the corners) and the sides between,
  // each encoded off the main thread.
  var strips = function (w, h, r) {
    var T = Math.ceil(Math.max(r, SHADE_TO));
    var all = [[0, 0, w, T], [0, h - T, w, T], [0, T, T, h - 2 * T], [w - T, T, T, h - 2 * T]];
    return all.filter(function (s) { return s[2] > 0 && s[3] > 0; });
  };
  var rimFor = function (s, w, h, r, q) {
    var c = document.createElement('canvas');
    c.width = Math.round(s[2] * q);
    c.height = Math.round(s[3] * q);
    var g = c.getContext('2d');
    g.scale(c.width / s[2], c.height / s[3]);
    g.translate(-s[0], -s[1]);
    var ring = function (d, width, paint) {
      var o = d + width / 2, R = Math.max(0, r - o), x0 = o, y0 = o, x1 = w - o, y1 = h - o;
      g.beginPath();
      g.moveTo(x0 + R, y0);
      g.arcTo(x1, y0, x1, y1, R);
      g.arcTo(x1, y1, x0, y1, R);
      g.arcTo(x0, y1, x0, y0, R);
      g.arcTo(x0, y0, x1, y0, R);
      g.closePath();
      g.lineWidth = width;
      g.strokeStyle = paint;
      g.stroke();
    };
    ring(0, LINE, 'rgba(255,255,255,' + LIT + ')');
    for (var d = LINE; d < SHADE_TO; d += 0.5) ring(d, 0.5, 'rgba(0,0,0,' + (SHADE * (1 - (d + 0.25 - LINE) / (SHADE_TO - LINE))).toFixed(4) + ')');
    return new Promise(function (ok) {
      c.toBlob(function (blob) {
        if (!blob) return ok('');
        var read = new FileReader();
        read.onload = function () { ok(read.result); };
        read.onerror = function () { ok(''); };
        read.readAsDataURL(blob);
      }, 'image/png');
    });
  };

  // One filter per tile size. Within the band: the tile looked up through the map, the haze over
  // that, cut to the band and the tile's own shape; over the tile as it is. Until its maps load
  // the band is empty, so the tile shows as it is.
  var filters = {};
  var filterFor = function (key, W, H, k, w, h, r, bg, q) {
    if (filters[key]) return filters[key];
    var urls = draw(w, h, r, bg);
    var id = 'vtl-' + Object.keys(filters).length;
    var f = el('filter', { id: id, x: 0, y: 0, width: W, height: H, filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, defs);
    var href = function (im, url) {
      im.setAttribute('href', url);
      im.setAttributeNS(XL, 'xlink:href', url);
    };
    var image = function (name, url, x, y, iw, ih) {
      var im = el('feImage', { x: x || 0, y: y || 0, width: iw || W, height: ih || H, preserveAspectRatio: 'none', result: name }, f);
      if (url) href(im, url);
      return im;
    };
    image('map', urls[0]);
    image('haze', urls[1]);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: (S / k).toFixed(4),
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'bent' }, f);
    el('feComposite', { in: 'haze', in2: 'bent', operator: 'over', result: 'lit' }, f);
    el('feComposite', { in: 'lit', in2: 'map', operator: 'in', result: 'band' }, f);
    el('feComposite', { in: 'band', in2: 'SourceAlpha', operator: 'in', result: 'rim' }, f);
    el('feComposite', { in: 'rim', in2: 'SourceGraphic', operator: 'over', result: 'glass' }, f);
    // the bright rim over it all (its strips show nothing until they're drawn)
    var parts = strips(w, h, r);
    var rims = parts.map(function (s, n) { return image('edge' + n, '', s[0] / k, s[1] / k, s[2] / k, s[3] / k); });
    var merge = el('feMerge', { result: 'edge' }, f);
    rims.forEach(function (im, n) { el('feMergeNode', { in: 'edge' + n }, merge); });
    el('feComposite', { in: 'edge', in2: 'glass', operator: 'over' }, f);
    var decoded = function (u) {
      var img = new Image();
      img.src = u;
      return img.decode ? img.decode().catch(function () {}) : new Promise(function (ok) { img.onload = img.onerror = ok; });
    };
    // ready once the maps and the rim have decoded, so a tile never shows a half-loaded filter
    var ready = Promise.all(urls.map(decoded).concat(parts.map(function (s, n) {
      return rimFor(s, w, h, r, q).then(function (u) {
        if (!u) return;
        href(rims[n], u);
        return decoded(u);
      });
    })));
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
    var q = Math.min(3, window.devicePixelRatio || 1);
    var key = [W, H, k.toFixed(3), r.toFixed(1), bg.join(), q].join('/');
    if (t.__vtl === key) return;
    t.__vtl = key;
    var f = filterFor(key, W, H, k, w, h, r, bg, q);
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
