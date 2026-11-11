import { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import {
  AVOID_IDS, COPY, createPartnerBarrier, isHidden, KIND_LABELS, localDay, MOBILE_ITERATIONS,
  type AvoidId, type BarrierConfig, type Mode, type Patch, type Theme,
} from "@algone/core";
import { SITES } from "@algone/rules";
import { rulesConfig } from "../config";
import { MOBILE_COPY } from "../copy";
import { mobileKdf } from "../kdf";
import { useNav } from "../nav";
import { offeredKinds } from "../pageSite";
import { store } from "../store";
import { useStored } from "../theme";
import { Body, Button, Card, Choice, Field, Screen } from "../ui";

const MODES: Array<[Mode, string]> = [
  ["healthy", "Healthy"],
  ["nofeed", "No feed"],
  ["random", "Random"],
  ["tuned", "Tuned"],
  ["custom", "Custom"],
];

const THEMES: Array<[Theme, string]> = [["system", "System"], ["dark", "Dark"], ["light", "Light"]];

const BARRIERS: Array<[BarrierConfig["type"], string]> = [
  ["pause", "Wait"],
  ["typing", "Typing"],
  ["daily", "Daily limit"],
  ["schedule", "Schedule"],
  ["locked", "Lock"],
  ["partner", "Partner"],
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function useApply() {
  const nav = useNav();
  return async (patch: Patch): Promise<string> => {
    const r = await store.patch(patch);
    if (r.needsBarrier) nav.push({ name: "barrier" });
    return r.error ?? "";
  };
}

function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Body size={14}>{props.label}</Body>
      </View>
      <Switch accessibilityLabel={props.label} value={props.value} onValueChange={props.onChange} />
    </View>
  );
}

function SiteSettings({ id }: { id: string }) {
  const apply = useApply();
  const { settings } = useStored();
  const rule = useMemo(() => SITES.find((s) => s.id === id)!, [id]);
  const site = settings.sites[id]!;
  const [keywords, setKeywords] = useState(site.tuned.blockKeywords.join(", "));

  const saveKeywords = () => {
    const blockKeywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    void apply({ op: "setTuned", site: id, filters: { ...site.tuned, blockKeywords } });
  };

  return (
    <Card>
      <Toggle
        label={`Algone on ${rule.name}`}
        value={site.enabled}
        onChange={(enabled) => void apply({ op: "setSiteEnabled", site: id, enabled })}
      />
      <Choice value={site.mode} options={MODES} onChange={(mode) => void apply({ op: "setMode", site: id, mode })} />
      {rule.elements.map((el) => (
        <Toggle
          key={el.id}
          label={`Hide ${el.label}`}
          value={isHidden(el, site)}
          onChange={(hidden) => void apply({ op: "setElement", site: id, element: el.id, hidden })}
        />
      ))}
      <Toggle
        label="Pause when opening this site"
        value={site.intent.launchPause}
        onChange={(value) => void apply({ op: "setIntent", site: id, key: "launchPause", value })}
      />
      <Toggle
        label="Search first"
        value={site.intent.searchHome}
        onChange={(value) => void apply({ op: "setIntent", site: id, key: "searchHome", value })}
      />
      {site.mode === "tuned" ? (
        <>
          {offeredKinds(rule).map((kind) => (
            <Toggle
              key={kind}
              label={`Hide ${KIND_LABELS[kind] ?? kind}`}
              value={site.tuned.hideKinds.includes(kind)}
              onChange={(on) => {
                const rest = site.tuned.hideKinds.filter((k) => k !== kind);
                void apply({
                  op: "setTuned",
                  site: id,
                  filters: { ...site.tuned, hideKinds: on ? [...rest, kind] : rest },
                });
              }}
            />
          ))}
          <Body muted size={13}>{COPY.likelyAi}</Body>
          <Field
            accessibilityLabel="Blocked keywords"
            placeholder="Blocked keywords, separated by commas"
            value={keywords}
            onChangeText={setKeywords}
            onEndEditing={saveKeywords}
            autoCapitalize="none"
          />
        </>
      ) : null}
    </Card>
  );
}

/** Partial, so a list added in core shows under its id until it gets a label here. */
const AVOID_LABELS: Partial<Record<AvoidId, string>> = {
  outrage: "Outrage and ragebait",
  clickbait: "Clickbait",
  comparison: "Rich, perfect-life and looks comparison",
  doom: "Doom and disaster",
};

const BREAK_HOURS: Array<["1" | "4" | "12" | "24", string]> = [["1", "1 hour"], ["4", "4 hours"], ["12", "12 hours"], ["24", "24 hours"]];

function HealthySettings() {
  const apply = useApply();
  const { settings, healthy } = useStored();
  const [batchSize, setBatchSize] = useState(String(settings.healthy.batchSize));
  const [budget, setBudget] = useState(String(settings.healthy.dailyBudgetMinutes));
  const [activities, setActivities] = useState(settings.activities.join("\n"));
  const [hours, setHours] = useState<(typeof BREAK_HOURS)[number][0]>("1");
  const [error, setError] = useState("");
  const now = Date.now();
  const used = healthy.usage.day === localDay(now) ? healthy.usage.minutes : 0;
  const onBreak = settings.breakUntil > now;

  const run = async (patch: Patch) => setError(await apply(patch));

  return (
    <Card>
      <Body strong>Healthy feed</Body>
      <Body muted size={13}>
        On sites in Healthy mode, Algone hides the feed and shows a short batch picked from what the site already loaded: its own picks and the people you follow. It pushes out outrage, clickbait and doom, then ends so you can go.
      </Body>
      <Body muted size={13}>
        It ranks only what the site loaded. It cannot change the site's own ranking or rerank inside apps. The word lists miss some and wrongly catch some.
      </Body>
      <Field
        accessibilityLabel="Items per day, per site"
        placeholder="Items per day, per site"
        value={batchSize}
        onChangeText={setBatchSize}
        onEndEditing={() => void run({ op: "setHealthy", batchSize: Number(batchSize) })}
        keyboardType="number-pad"
      />
      <Body muted size={13}>Items per day, per site (1 to 50)</Body>
      <Field
        accessibilityLabel="Minutes per day on picked items"
        placeholder="Minutes per day on picked items"
        value={budget}
        onChangeText={setBudget}
        onEndEditing={() => void run({ op: "setHealthy", dailyBudgetMinutes: Number(budget) })}
        keyboardType="number-pad"
      />
      <Body muted size={13}>
        {`Minutes per day on picked items. Used today on this device: ${used} of ${settings.healthy.dailyBudgetMinutes} minutes.`}
      </Body>
      <Body strong>Keep out</Body>
      {AVOID_IDS.map((id) => (
        <Toggle
          key={id}
          label={AVOID_LABELS[id] ?? id}
          value={settings.avoid.includes(id)}
          onChange={(on) =>
            void run({ op: "setAvoid", ids: on ? [...settings.avoid, id] : settings.avoid.filter((a) => a !== id) })
          }
        />
      ))}
      <Body strong>Instead</Body>
      <Body muted size={13}>Things you'd rather do, one per line. They show when a batch ends.</Body>
      <Field
        accessibilityLabel="Things you'd rather do, one per line"
        value={activities}
        onChangeText={setActivities}
        multiline
      />
      <Button
        label="Save"
        onPress={() =>
          void run({
            op: "setActivities",
            items: activities.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20),
          })
        }
      />
      <Body strong>Take a break</Body>
      <Body muted size={13}>
        Shows the sites' feeds for a while, then Algone comes back by itself. Shorts, Reels and autoplay stay off. One break a week, through your barrier.
      </Body>
      {onBreak ? (
        <>
          <Body>{`On a break until ${new Date(settings.breakUntil).toLocaleString()}`}</Body>
          <Button label="End the break now" onPress={() => void run({ op: "endBreak" })} />
        </>
      ) : (
        <>
          <Choice value={hours} options={BREAK_HOURS} onChange={setHours} />
          <Button
            label="Start a break"
            onPress={() => void run({ op: "startBreak", until: Date.now() + Number(hours) * 3_600_000 })}
          />
        </>
      )}
      {error ? <Body muted>{error}</Body> : null}
    </Card>
  );
}

function BarrierForm() {
  const apply = useApply();
  const { settings } = useStored();
  const [type, setType] = useState(settings.barrier.type);
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const n = (fallback: number) => Number(amount || fallback);

  const build = async (): Promise<BarrierConfig> => {
    const current = settings.barrier;
    switch (type) {
      case "pause":
        return { type, seconds: n(30) };
      case "typing":
        return { type, length: n(60) };
      case "daily":
        return { type, limit: n(3), step: "pause" };
      case "schedule":
        return { type, windows: [{ days: ALL_DAYS, start, end }] };
      case "locked":
        return {
          type,
          until: Date.now() + n(24) * 3_600_000,
          escapeUsed: false,
          after: current.type === "locked" ? current.after : current,
        };
      case "partner":
        return createPartnerBarrier(password, mobileKdf, MOBILE_ITERATIONS);
    }
  };

  const save = async () => {
    if (type === "partner" && !password) {
      setError("Set a password");
      return;
    }
    setBusy(true);
    const barrier = await build();
    setBusy(false);
    setPassword("");
    setError(await apply({ op: "setBarrier", barrier }));
  };

  const label =
    type === "pause" ? "Seconds to wait (10 to 120)"
    : type === "typing" ? "Characters to type (20 to 200)"
    : type === "daily" ? "Unlocks a day"
    : type === "locked" ? "Hours to lock (at most 168)"
    : null;

  return (
    <Card>
      <Body strong>Unlock barrier</Body>
      <Choice value={type} options={BARRIERS} onChange={setType} />
      {label ? (
        <Field accessibilityLabel={label} placeholder={label} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
      ) : null}
      {type === "schedule" ? (
        <>
          <Field accessibilityLabel="Opens at" placeholder="Opens at, 18:00" value={start} onChangeText={setStart} />
          <Field accessibilityLabel="Closes at" placeholder="Closes at, 19:00" value={end} onChangeText={setEnd} />
        </>
      ) : null}
      {type === "partner" ? (
        <>
          <Field accessibilityLabel="Partner password" placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <Body muted size={13}>Stored only as a hash on this device. If it is forgotten, a 24 hour wait resets the barrier.</Body>
        </>
      ) : null}
      {error ? <Body muted>{error}</Body> : null}
      <Button label={busy ? "Saving" : "Save barrier"} disabled={busy} onPress={() => void save()} />
      <Body muted size={13}>{COPY.uninstall}</Body>
      <Body muted size={13}>{COPY.bypass}</Body>
    </Card>
  );
}

export function SettingsScreen() {
  const nav = useNav();
  const apply = useApply();
  const { settings, runtime } = useStored();
  const [open, setOpen] = useState(SITES[0]?.id ?? "");

  return (
    <Screen title="Settings">
      <Choice value={open} options={SITES.map((s) => [s.id, s.name])} onChange={setOpen} />
      {open ? <SiteSettings key={open} id={open} /> : null}
      <HealthySettings />
      <BarrierForm />
      <Button label="Sync and settings file" onPress={() => nav.push({ name: "sync" })} />
      <Card>
        <Choice
          value={settings.theme}
          options={THEMES}
          onChange={(value) => void apply({ op: "setGlobal", key: "theme", value })}
        />
        <Toggle
          label="Stop at the end of a video"
          value={settings.stopAtEnd}
          onChange={(value) => void apply({ op: "setGlobal", key: "stopAtEnd", value })}
        />
        {rulesConfig.remote ? (
          <>
            <Toggle
              label="Daily rule updates"
              value={settings.ruleUpdates}
              onChange={(value) => void apply({ op: "setGlobal", key: "ruleUpdates", value })}
            />
            <Body muted size={13}>{COPY.rules}</Body>
            {runtime.lastRuleError ? <Body muted size={13}>Last update problem: {runtime.lastRuleError}</Body> : null}
          </>
        ) : null}
      </Card>
      <Body muted size={13}>{MOBILE_COPY.inAppBrowser} {COPY.browserOnly}</Body>
      <Body muted size={13}>{MOBILE_COPY.youtubeSignIn}</Body>
      <Body muted size={13}>{COPY.privacy}</Body>
    </Screen>
  );
}
