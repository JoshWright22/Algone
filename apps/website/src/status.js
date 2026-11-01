// Fills the "Last daily check" column from the status file the daily check
// writes. If the file is missing or unreadable, the rest of the page still stands.
(function () {
  var table = document.getElementById("site-table");
  var summary = document.getElementById("status-summary");
  if (!table || !summary) return;

  var OUTCOMES = {
    pass: "Pass",
    broken: "Broken",
    inconclusive: "Inconclusive",
    walled: "Walled",
    "not-checked": "Not checked",
  };
  var STALE_DAYS = 3;
  var DAY_MS = 86400000;
  var cells = table.querySelectorAll("td[data-site]");
  var has = Object.prototype.hasOwnProperty;

  function each(fn) {
    Array.prototype.forEach.call(cells, fn);
  }
  function unavailable() {
    each(function (cell) { cell.textContent = "No data"; });
    summary.textContent =
      "Daily check results are not available right now. The rule check dates in the table still apply.";
  }
  function dateText(date) {
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  each(function (cell) { cell.textContent = "Loading"; });
  summary.textContent = "Loading daily check results.";

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 8000);

  fetch(table.dataset.statusUrl, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: controller.signal,
  })
    .then(function (res) {
      if (!res.ok) throw new Error("status " + res.status);
      return res.json();
    })
    .then(function (status) {
      var date = new Date(status.date);
      if (isNaN(date) || !status.sites || typeof status.sites !== "object") throw new Error("bad shape");

      each(function (cell) {
        var site = has.call(status.sites, cell.dataset.site) ? status.sites[cell.dataset.site] : null;
        var outcome = site && site.walled ? "walled" : site && site.outcome;
        var known = has.call(OUTCOMES, outcome);
        cell.textContent = known ? OUTCOMES[outcome] : "No data";
        if (known) cell.dataset.outcome = outcome;
      });

      var age = Math.floor((Date.now() - date.getTime()) / DAY_MS);
      summary.textContent = "Last daily check: " + dateText(date) + ".";
      if (age >= STALE_DAYS) {
        summary.textContent += " That was " + age +
          " days ago, so the check may have stopped running and these results may be out of date.";
      }
    })
    .catch(unavailable)
    .finally(function () { clearTimeout(timer); });
})();
