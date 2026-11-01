// Loads the real Firefox build in Firefox and checks hiding on a local page.
// *.localhost resolves to the loopback address, so no real site is touched.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { Builder, By } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

const ext = resolve("apps/extension/dist-test/firefox");
const html = readFileSync("tests/fixtures/youtube/watch.html", "utf8");
const server = createServer((_req, res) => {
  res.setHeader("content-type", "text/html");
  res.end(html);
}).listen(0);
const port = server.address().port;

const options = new firefox.Options().addArguments("-headless");
if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
const builder = new Builder().forBrowser("firefox").setFirefoxOptions(options);
if (process.env.GECKODRIVER) {
  builder.setFirefoxService(new firefox.ServiceBuilder(process.env.GECKODRIVER));
}
const driver = await builder.build();

let failed = false;
const check = (name, ok) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failed = true;
};

try {
  const addonId = await driver.installAddon(ext, true);
  check("temporary add-on installs", Boolean(addonId));
  await driver.sleep(1500);
  await driver.get(`http://youtube.localhost:${port}/watch?v=dQw4w9WgXcQ`);
  await driver.sleep(1500);
  const state = await driver.executeScript(`
    const hidden = (s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length === 0; };
    return {
      route: document.documentElement.getAttribute("data-algone-route"),
      show: document.documentElement.getAttribute("data-algone-show"),
      sidebar: hidden("ytd-watch-next-secondary-results-renderer"),
      comments: hidden("ytd-comments#comments"),
    };
  `);
  console.log(state);
  check("content script ran and wrote attributes", state.show !== null);
  check("route attribute is set", state.route === "watch");
  check("sidebar recommendations hidden", state.sidebar === true);
  check("comments stay visible", state.comments === false);
  // The panel iframe proves extension pages load inside a page under Firefox.
  const frames = await driver.findElements(By.css('iframe[data-algone-panel="save"]'));
  check("save panel iframe mounted", frames.length === 1);
} catch (e) {
  console.error(e);
  failed = true;
} finally {
  await driver.quit();
  server.close();
}
void execFileSync;
void join;
process.exit(failed ? 1 : 0);
