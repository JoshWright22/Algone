import {
  createGist, defaultSettings, findGist, GistError, nextRevision, parsePolicy, policyFromSettings, readGist,
  settingsFromPolicy, validatePolicy, zenList, POLICY_FILE, type Fetch, type Policy,
} from "@algone/core";
import { SITES } from "@algone/rules";

/**
 * `algone`: the settings file from a terminal, for people and for AI agents.
 * An edit here is as safe as any other device's: each device still applies a looser
 * setting only after its own barrier.
 */
export interface Io {
  readFile(path: string): Promise<string>;
  writeFile(path: string, text: string): Promise<void>;
  out(text: string): void;
  err(text: string): void;
  env: Record<string, string | undefined>;
  fetch: Fetch;
  now(): number;
}

export const HELP = `algone: the Algone settings file from a terminal.

  algone init <file>                  Write a settings file with the defaults
  algone validate <file>              Check a settings file
  algone get <file> [path]            Print the settings, or one value (dot path)
  algone set <file> <path> <json>     Change one value, check the file, and save it
  algone export-zen <file> [out]      Build a Zen filter list (hide rules only)
  algone pull <file>                  Download the synced file from your Gist
  algone push <file>                  Upload a file to your Gist as the next revision
  algone install [chrome] [edge]      Install Algone from the newest release, and keep it updated
  algone install --from <dist>        Install from a local build (apps/extension/dist)
  algone update [chrome] [edge]       Update now (the scheduled task runs this every hour)
  algone stop-updates                 Remove the scheduled update

Paths are inside "settings", like sites.youtube.mode or healthy.batchSize.
Use overrides.platform:android.<path> for one platform.
pull and push read a GitHub token from ALGONE_GITHUB_TOKEN or GITHUB_TOKEN.
Looser settings never apply at once: each device asks for its barrier first.
`;

class Fail extends Error {}

const who = (io: Io) => `agent:${(io.env.ALGONE_AGENT ?? "cli").replace(/[^\w.-]/g, "").slice(0, 40) || "cli"}`;

async function load(io: Io, file: string): Promise<Policy> {
  let text: string;
  try {
    text = await io.readFile(file);
  } catch {
    throw new Fail(`Cannot read ${file}`);
  }
  const r = parsePolicy(text, SITES);
  if (!r.ok) throw new Fail(`${file}: ${r.error}`);
  return r.policy;
}

const save = (io: Io, file: string, p: Policy) => io.writeFile(file, `${JSON.stringify(p, null, 2)}\n`);

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // A bare word, such as nofeed, is a string.
  }
}

/** Sets `value` at a dot path. Path segments may not reach outside plain data. */
function setPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  if (!keys.length || keys.some((k) => !k || k === "__proto__" || k === "constructor" || k === "prototype")) {
    throw new Fail(`Bad path: ${path}`);
  }
  let node: Record<string, unknown> = root;
  for (const k of keys.slice(0, -1)) {
    const next = node[k];
    if (next === undefined) node[k] = {};
    else if (typeof next !== "object" || next === null || Array.isArray(next)) throw new Fail(`${path}: ${k} is not an object`);
    node = node[k] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]!] = value;
}

function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((n, k) => (n && typeof n === "object" ? (n as Record<string, unknown>)[k] : undefined), root);
}

function token(io: Io): string {
  const t = io.env.ALGONE_GITHUB_TOKEN ?? io.env.GITHUB_TOKEN ?? "";
  if (!t) throw new Fail("Set ALGONE_GITHUB_TOKEN (a GitHub token with the Gist permission).");
  return t;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [cmd, file, a, b] = argv;
  try {
    switch (cmd) {
      case "init": {
        if (!file) throw new Fail("Usage: algone init <file>");
        await save(io, file, policyFromSettings(defaultSettings(SITES), 1, who(io), io.now()));
        io.out(`Wrote ${file}`);
        return 0;
      }
      case "validate": {
        if (!file) throw new Fail("Usage: algone validate <file>");
        const p = await load(io, file);
        io.out(`${file} is valid (revision ${p.rev}).`);
        return 0;
      }
      case "get": {
        if (!file) throw new Fail("Usage: algone get <file> [path]");
        const p = await load(io, file);
        const v = a ? getPath(a.startsWith("overrides.") ? p : p.settings, a) : p.settings;
        if (v === undefined) throw new Fail(`Nothing at ${a}`);
        io.out(JSON.stringify(v, null, 2));
        return 0;
      }
      case "set": {
        if (!file || !a || b === undefined) throw new Fail("Usage: algone set <file> <path> <json>");
        const p = await load(io, file);
        const raw = JSON.parse(JSON.stringify(p)) as Record<string, unknown>;
        if (a.startsWith("overrides.")) {
          const [, key, ...rest] = a.split(".");
          // Override keys contain a colon and may contain dots in device ids, so split once.
          if (!key || !rest.length) throw new Fail("Use overrides.<platform:name>.<path>");
          const overrides = raw.overrides as Record<string, Record<string, unknown>>;
          overrides[key] ??= {};
          setPath(overrides[key]!, rest.join("."), parseValue(b));
        } else {
          setPath(raw.settings as Record<string, unknown>, a, parseValue(b));
        }
        const checked = validatePolicy(raw, SITES);
        if (!checked.ok) throw new Fail(`Not saved: ${checked.error}`);
        const next = nextRevision(checked.policy, checked.policy.settings, who(io), io.now());
        await save(io, file, next);
        io.out(`Saved ${file} (revision ${next.rev}). Looser settings wait for each device's barrier.`);
        return 0;
      }
      case "export-zen": {
        if (!file) throw new Fail("Usage: algone export-zen <file> [out]");
        const p = await load(io, file);
        const settings = settingsFromPolicy(p, SITES, {
          platform: "desktop",
          deviceId: "",
          local: { theme: "system", breakUntil: 0, barrier: p.settings.barrier },
        });
        const list = zenList(settings, SITES, new Date(io.now()).toISOString());
        if (a) {
          await io.writeFile(a, list.text);
          io.out(`Wrote ${list.rules} rules to ${a}. In Zen, add it under Filter lists.`);
        } else {
          io.out(list.text);
        }
        return 0;
      }
      case "pull": {
        if (!file) throw new Fail("Usage: algone pull <file>");
        const t = token(io);
        const id = await findGist(io.fetch, t);
        if (!id) throw new Fail("No Algone settings Gist in this GitHub account yet. Turn on sync in Algone first.");
        const remote = await readGist(io.fetch, t, id);
        const r = parsePolicy(remote.text, SITES);
        if (!r.ok) throw new Fail(`The synced file has a problem: ${r.error}`);
        await save(io, file, r.policy);
        io.out(`Wrote ${file} (revision ${r.policy.rev}).`);
        return 0;
      }
      case "push": {
        if (!file) throw new Fail("Usage: algone push <file>");
        const t = token(io);
        const local = await load(io, file);
        const id = await findGist(io.fetch, t);
        let rev = 1;
        if (id) {
          const remote = parsePolicy((await readGist(io.fetch, t, id)).text, SITES);
          rev = (remote.ok ? remote.policy.rev : 0) + 1;
          const next = { ...local, rev, updatedAt: new Date(io.now()).toISOString(), updatedBy: who(io) };
          const res = await io.fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
            body: JSON.stringify({ files: { [POLICY_FILE]: { content: JSON.stringify(next, null, 2) } } }),
          });
          if (!res.ok) throw new Fail(`GitHub answered ${res.status}`);
        } else {
          await createGist(io.fetch, t, { ...local, rev, updatedBy: who(io) });
        }
        io.out(`Pushed revision ${rev}. Stricter settings apply on each device at its next sync; looser ones wait for its barrier.`);
        return 0;
      }
      default:
        io.out(HELP);
        return cmd && cmd !== "help" && cmd !== "--help" ? 1 : 0;
    }
  } catch (e) {
    if (e instanceof Fail || e instanceof GistError) {
      io.err(e.message);
      return 1;
    }
    throw e;
  }
}
