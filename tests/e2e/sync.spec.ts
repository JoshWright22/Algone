import type { BrowserContext } from "@playwright/test";
import { expect, extPage, getStorage, test } from "./harness";

const TOKEN = "github_pat_0123456789abcdefghijklmnop";

/** An in-memory Gist API, served to the extension through Playwright routing. */
async function fakeGist(context: BrowserContext) {
  const gists = new Map<string, { files: Record<string, { content: string }>; history: string[] }>();
  let n = 0;
  const view = (id: string) => ({ id, files: gists.get(id)!.files, history: gists.get(id)!.history.map((version) => ({ version })) });
  await context.route("https://api.github.com/**", async (route) => {
    const req = route.request();
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, PATCH" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (req.headers().authorization !== `Bearer ${TOKEN}`) return route.fulfill({ status: 401, headers: cors, body: "{}" });
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (req.method() === "GET" && path === "/gists") return json([...gists.keys()].map(view));
    if (req.method() === "POST" && path === "/gists") {
      const id = `g${++n}`;
      gists.set(id, { files: req.postDataJSON().files, history: [`v${++n}`] });
      return json(view(id), 201);
    }
    const id = path.split("/")[2]!;
    const g = gists.get(id);
    if (!g) return json({}, 404);
    if (req.method() === "PATCH") {
      Object.assign(g.files, req.postDataJSON().files);
      g.history.unshift(`v${++n}`);
    }
    return json(view(id));
  });
  return {
    policy: (id = "g1") => JSON.parse(gists.get(id)!.files["algone-policy.json"]!.content),
    edit(change: (p: any) => void, id = "g1") {
      const g = gists.get(id)!;
      const p = JSON.parse(g.files["algone-policy.json"]!.content);
      change(p);
      p.rev += 1;
      g.files["algone-policy.json"] = { content: JSON.stringify(p) };
      g.history.unshift(`v${++n}`);
    },
  };
}

test("sync: connect, send changes, and hold another device's loosening for the barrier", async ({ h }) => {
  const gh = await fakeGist(h.context);
  const opts = await extPage(h, "options.html#sync");
  await opts.locator("#sync-token").fill(TOKEN);
  await opts.locator("#sync-connect").click();
  await expect(opts.locator("#sync-state")).toContainText(/Synced \d/);
  expect(gh.policy().settings.sites.youtube.mode).toBe("healthy");
  expect(await getStorage(h, "syncToken")).toBe(TOKEN);

  // A change here is sent on the next round.
  await opts.evaluate(() => chrome.runtime.sendMessage({ t: "patch", patch: { op: "setElement", site: "youtube", element: "comments", hidden: true } }));
  expect(await opts.evaluate(() => chrome.runtime.sendMessage({ t: "syncNow" }))).toMatchObject({ ok: true });
  expect(gh.policy().settings.sites.youtube.elements.comments).toBe(true);
  expect(gh.policy().settings.theme).toBeUndefined();

  // Another device (or an agent) turns YouTube off and hides Reddit's comments.
  gh.edit((p) => {
    p.updatedBy = "agent:claude";
    p.settings.sites.youtube.enabled = false;
    p.settings.sites.reddit.elements = { comments: true };
  });
  await opts.evaluate(() => chrome.runtime.sendMessage({ t: "syncNow" }));
  const settings = await getStorage(h, "settings");
  expect(settings.sites.reddit.elements.comments).toBe(true);
  expect(settings.sites.youtube.enabled).toBe(true);
  await expect(opts.locator("#sync-pending")).toContainText("Loosen 1 setting from another device");
  const [unlock] = await Promise.all([
    h.context.waitForEvent("page", (p) => p.url().includes("unlock.html")),
    opts.locator("#sync-review").click(),
  ]);
  await unlock.waitForLoadState();
  await expect(unlock.locator("body")).toContainText("Loosen 1 setting from another device");
});

test("sync: a wrong token is refused and nothing is kept", async ({ h }) => {
  await fakeGist(h.context);
  const opts = await extPage(h, "options.html#sync");
  await opts.locator("#sync-token").fill("github_pat_wrongwrongwrongwrongwrong");
  await opts.locator("#sync-connect").click();
  await expect(opts.locator("#sync-status")).toContainText("Sign in again");
  expect(await getStorage(h, "syncToken")).toBeUndefined();
});
