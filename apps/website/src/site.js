// Three small behaviors: the rail follows the page, struck text draws itself,
// and the home page feed can be wiped with the blue bar. Without JavaScript the
// page reads the same, and the demo simply shows the Custom panel.
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

  /* The wall: the bar wipes the site's feed, and a mode fills the space. */

  function wall() {
    var root = document.querySelector("[data-wall]");
    if (!root) return;
    var stage = root.querySelector(".mock-stage");
    var feed = root.querySelector(".mock-feed");
    var strike = root.querySelector(".wall-strike");
    var range = root.querySelector("input");
    var modes = root.querySelectorAll("[data-mode]");
    var layers = root.querySelectorAll("[data-layer]");
    var note = root.querySelector(".wall-note");
    var moved = false;

    function set(value) {
      var share = Math.max(0, Math.min(100, value));
      feed.style.clipPath = "inset(" + share + "% 0 0 0)";
      strike.style.top = Math.min(share, 95) + "%";
      range.value = String(Math.round(share));
    }

    function fromPointer(event) {
      var box = stage.getBoundingClientRect();
      set(((event.clientY - box.top) / box.height) * 100);
    }

    root.classList.add("is-live");
    range.disabled = false;
    set(0);

    Array.prototype.forEach.call(modes, function (button) {
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(modes, function (b) {
          b.setAttribute("aria-pressed", String(b === button));
        });
        Array.prototype.forEach.call(layers, function (layer) {
          layer.hidden = layer.dataset.layer !== button.dataset.mode;
        });
        note.textContent = button.dataset.note;
        moved = true;
        set(100);
      });
    });

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

    // The one uninvited motion on the site: the bar takes a first pass.
    var rest = 58;
    if (calm || !("IntersectionObserver" in window)) { set(rest); return; }
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
    }, { threshold: 0.4 });
    seen.observe(stage);
  }

  document.addEventListener("DOMContentLoaded", function () {
    follow();
    strikes();
    wall();
  });
})();
