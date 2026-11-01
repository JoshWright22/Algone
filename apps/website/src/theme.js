// Loaded in <head> so a stored theme applies before first paint.
(function () {
  var KEY = "algone-theme";
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === "light" || stored === "dark") root.dataset.theme = stored;

  var light = matchMedia("(prefers-color-scheme: light)");
  function current() {
    return root.dataset.theme || (light.matches ? "light" : "dark");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("theme-toggle");
    if (!button) return;
    function label() {
      button.textContent = current() === "dark" ? "Light theme" : "Dark theme";
    }
    label();
    button.hidden = false;
    button.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) {}
      label();
    });
    light.addEventListener("change", label);
  });
})();
