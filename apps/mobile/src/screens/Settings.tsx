import { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import {
  COPY, createPartnerBarrier, isHidden, KIND_LABELS, MOBILE_ITERATIONS,
  type BarrierConfig, type Mode, type Patch, type Theme,
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
  const apply = useApply();
  const { settings, runtime } = useStored();
  const [open, setOpen] = useState(SITES[0]?.id ?? "");

  return (
    <Screen title="Settings">
      <Choice value={open} options={SITES.map((s) => [s.id, s.name])} onChange={setOpen} />
      {open ? <SiteSettings key={open} id={open} /> : null}
      <BarrierForm />
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
