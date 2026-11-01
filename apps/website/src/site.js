// Three small behaviors: the rail follows the page, struck text draws itself,
// and the home page feed can be wiped with the blue bar. Without JavaScript the
// page reads the same and the feed area is simply empty.
(function () {
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function follow() {
    var links = document.querySelectorAll(".rail-index a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var byId = {};
    Array.prototype.forEach.call(links, function (a) { byId[a.hash.slice(1)] = a; });
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Array.prototype.forEach.call(links, function (a) { a.removeAttribute("aria-current"); });
        byId[entry.target.id].setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) {
      var target = document.getElementById(id);
      if (target) seen.observe(target);
    });
  }

  function strikes() {
    var items = document.querySelectorAll(".struck");
    if (calm || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("will-strike");
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-struck");
        seen.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    Array.prototype.forEach.call(items, function (item) { seen.observe(item); });
  }

  /* The wall: a made-up feed in 1-bit ordered dither. */

  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var DOT = 3;

  function seeded(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  }

  // Each thumbnail is a soft scene: a tone sweep, a bright or dark disc, a band.
  function scene(random) {
    var angle = random() * Math.PI * 2;
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    var disc = { x: 0.2 + random() * 0.6, y: 0.25 + random() * 0.5, r: 0.14 + random() * 0.22, tone: random() > 0.5 ? 0.95 : 0.04 };
    var band = random() * 0.8;
    var base = 0.22 + random() * 0.4;
    return function (u, v) {
      var tone = base + ((u - 0.5) * dx + (v - 0.5) * dy) * 0.75;
      if (v > band && v < band + 0.16) tone += 0.2;
      var d = Math.hypot((u - disc.x) * 1.7, v - disc.y);
      if (d < disc.r) tone = disc.tone + d * 0.5;
      return tone;
    };
  }

  function paint(canvas) {
    var cssWidth = canvas.parentNode.clientWidth;
    var cssHeight = canvas.parentNode.clientHeight;
    var width = Math.ceil(cssWidth / DOT);
    var height = Math.ceil(cssHeight / DOT);
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
    var image = context.createImageData(width, height);
    var ink = getComputedStyle(canvas).color.match(/[\d.]+/g).map(Number);
    var random = seeded(20261031);
    var columns = cssWidth < 560 ? 2 : cssWidth < 820 ? 3 : 4;
    var gap = 4;
    var tile = Math.floor((width - gap * (columns + 1)) / columns);
    var thumb = Math.round(tile * 0.56);
    var bars = 13;

    function dot(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      var i = (y * width + x) * 4;
      image.data[i] = ink[0];
      image.data[i + 1] = ink[1];
      image.data[i + 2] = ink[2];
      image.data[i + 3] = 255;
    }

    for (var top = gap; top < height; top += thumb + bars + gap) {
      for (var c = 0; c < columns; c++) {
        var left = gap + c * (tile + gap);
        var light = scene(random);
        for (var y = 0; y < thumb; y++) {
          for (var x = 0; x < tile; x++) {
            var limit = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
            if (light(x / tile, y / thumb) < limit) dot(left + x, top + y);
          }
        }
        var first = 0.55 + random() * 0.4;
        var second = 0.3 + random() * 0.3;
        for (var line = 0; line < 2; line++) {
          for (var bx = 0; bx < tile * (line ? second : first); bx++) {
            for (var by = 0; by < 2; by++) dot(left + bx, top + thumb + 4 + line * 4 + by);
          }
        }
      }
    }
    context.putImageData(image, 0, 0);
  }

  function wall() {
    var root = document.querySelector("[data-wall]");
    if (!root) return;
    var feed = root.querySelector(".wall-feed");
    var canvas = root.querySelector("canvas");
    var strike = root.querySelector(".wall-strike");
    var range = root.querySelector("input");
    var moved = false;

    function set(value) {
      var share = Math.max(0, Math.min(100, value));
      canvas.style.clipPath = "inset(" + share + "% 0 0 0)";
      strike.style.top = share + "%";
      range.value = String(Math.round(share));
    }

    function fromPointer(event) {
      var box = feed.getBoundingClientRect();
      set(((event.clientY - box.top) / box.height) * 100);
    }

    root.classList.add("is-live");
    range.disabled = false;
    paint(canvas);
    set(0);

    strike.addEventListener("pointerdown", function (event) {
      moved = true;
      strike.setPointerCapture(event.pointerId);
      strike.classList.add("is-held");
      event.preventDefault();
      range.focus({ preventScroll: true });
    });
    strike.addEventListener("pointermove", function (event) {
      if (strike.classList.contains("is-held")) fromPointer(event);
    });
    ["pointerup", "pointercancel"].forEach(function (name) {
      strike.addEventListener(name, function () { strike.classList.remove("is-held"); });
    });
    range.addEventListener("input", function () {
      moved = true;
      set(Number(range.value));
    });

    var timer;
    addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { paint(canvas); }, 150);
    });
    new MutationObserver(function () { paint(canvas); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // The one uninvited motion on the site: the bar takes a first pass.
    var rest = 58;
    if (calm) { set(rest); return; }
    if (!("IntersectionObserver" in window)) { set(rest); return; }
    var seen = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      seen.disconnect();
      var start = performance.now() + 200;
      var length = 1500;
      (function step(now) {
        if (moved) return;
        var t = Math.max(0, Math.min(1, (now - start) / length));
        var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        set(rest * eased);
        if (t < 1) requestAnimationFrame(step);
      })(start);
    }, { threshold: 0.55 });
    seen.observe(feed);
  }

  document.addEventListener("DOMContentLoaded", function () {
    follow();
    strikes();
    wall();
  });
})();
