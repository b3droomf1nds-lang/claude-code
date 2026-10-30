/* Squircle corners: the smooth (G2) corner of Apple's windows and icons.

   A plain rounded corner is a quarter circle: the straight side stops and
   the arc starts at its full bend at once, a jump the eye picks up as a
   faint kink where the corner begins. This corner starts bending gently
   further along the side and tightens towards its middle, with no jump.
   Measured off Apple's own cards (the iPhone Air page on an iPhone, 28px
   corners), it's a gentle superellipse, |x|^3 + |y|^3 = 1, reaching just
   the box's border-radius along each side: close to a round corner, with
   only the start of the bend softened. So each box keeps its radius in the
   CSS and this works out the rest.

   Safari has no corner-shape, so each box is cut to the shape with a
   clip-path, redrawn whenever its size changes. While it's cut (.is-sq,
   theme-r2.css) its border-radius is 0, or the circle would trim the
   corner's middle. Off in Canva edit mode, whose outlines sit outside. */
(function () {
  'use strict';
  var N = 3, REACH = 1, STEPS = 24;
  var BOXES = '.pdp-cmp__grid > .pdp-cmp__card, .gallery__main, .sugg__face, .pdp--bold .atc__btn';
  var boxes = [].slice.call(document.querySelectorAll(BOXES));
  if (!boxes.length || !window.ResizeObserver || !(window.CSS && CSS.supports && CSS.supports('clip-path', 'path("M0 0")'))) return;

  // a quarter of the curve, from one side (1, 0) round to the other (0, 1)
  var QUARTER = [];
  for (var k = 0; k <= STEPS; k++) {
    var t = k / STEPS * Math.PI / 2;
    QUARTER.push([Math.pow(Math.cos(t), 2 / N), Math.pow(Math.sin(t), 2 / N)]);
  }
  var f = function (v) { return Math.round(v * 100) / 100; };

  // The outline of a box w × h with corner radii r (top right, bottom right, bottom left, top
  // left), clockwise from the top side: each corner's curve round its centre, (sx, sy) the way
  // out to the corner, and the sides the straight lines between.
  var shape = function (w, h, r) {
    var e = r.map(function (x) { return Math.min(x * REACH, w / 2, h / 2); });
    var corners = [[w - e[0], e[0], 1, -1, true], [w - e[1], h - e[1], 1, 1, false],
      [e[2], h - e[2], -1, 1, true], [e[3], e[3], -1, -1, false]];
    var d = [];
    corners.forEach(function (c, n) {
      var q = c[4] ? QUARTER.slice().reverse() : QUARTER;
      q.forEach(function (p) { d.push(f(c[0] + c[2] * e[n] * p[0]) + ' ' + f(c[1] + c[3] * e[n] * p[1])); });
    });
    return 'M' + d.join('L') + 'Z';
  };

  var RADII = ['borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'borderTopLeftRadius'];
  var fit = function (el, w, h) {
    el.classList.remove('is-sq');                    // to read the box's own radius
    var cs = getComputedStyle(el);
    var r = RADII.map(function (k) { return parseFloat(cs[k]) || 0; });
    if (!w || !h || !Math.max.apply(null, r)) { el.style.clipPath = ''; return; }
    el.style.clipPath = 'path("' + shape(w, h, r) + '")';
    el.classList.add('is-sq');
  };

  // the border box's own size, before any transform (the desktop grid is scaled)
  var watch = new ResizeObserver(function (list) {
    list.forEach(function (m) {
      var s = m.borderBoxSize && m.borderBoxSize[0];
      fit(m.target, s ? s.inlineSize : m.target.offsetWidth, s ? s.blockSize : m.target.offsetHeight);
    });
  });
  boxes.forEach(function (el) { watch.observe(el, { box: 'border-box' }); });
})();
