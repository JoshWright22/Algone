import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Share } from "react-native";
import { GITHUB_CLIENT_ID, MAX_POLICY_BYTES, pollDeviceFlow, startDeviceFlow, type Fetch } from "@algone/core";
import { useNav } from "../nav";
import { store, type Result } from "../store";
import { connectSync, runSync } from "../sync";
import { useStored } from "../theme";
import { Body, Button, Card, Field, Screen } from "../ui";

const netFetch: Fetch = (url, init) => fetch(url, init);

/** GitHub's device flow. Shown only once the maintainer has set GITHUB_CLIENT_ID. */
function SignIn({ onStatus }: { onStatus: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const signIn = async () => {
    setBusy(true);
    try {
      const code = await startDeviceFlow(netFetch, GITHUB_CLIENT_ID, Date.now());
      onStatus(`On GitHub, enter the code ${code.userCode}. Waiting...`);
      void Linking.openURL(code.verificationUri);
      let interval = code.interval;
      while (alive.current && Date.now() < code.expiresAt) {
        await new Promise((r) => setTimeout(r, interval * 1000));
        const r = await pollDeviceFlow(netFetch, GITHUB_CLIENT_ID, code);
        if (r.kind === "wait") interval = r.interval;
        else if (r.kind === "failed") return onStatus(r.error);
        else {
          const done = await connectSync(store, r.token, Platform.OS);
          return onStatus(done.ok ? "Signed in. Settings now sync." : `Could not sync: ${done.error}`);
        }
      }
      if (alive.current) onStatus("The code expired. Start again.");
    } catch (e) {
      onStatus(`Sign-in failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return <Button kind="primary" label={busy ? "Waiting for GitHub" : "Sign in with GitHub"} disabled={busy} onPress={() => void signIn()} />;
}

function Account({ onStatus }: { onStatus: (text: string) => void }) {
  const nav = useNav();
  const { sync, syncToken } = useStored();
  const [token, setToken] = useState("");

  if (syncToken) {
    return (
      <Card>
        <Body strong>Sync</Body>
        <Body>
          {sync.lastError
            ? `Last try ${new Date(sync.lastSync).toLocaleString()}: ${sync.lastError}`
            : `Synced ${sync.lastSync ? new Date(sync.lastSync).toLocaleString() : "not yet"}.`}
        </Body>
        {sync.pending ? (
          <>
            <Body>{sync.pending.label}</Body>
            <Button
              label="Review"
              onPress={() =>
                void store.syncReview().then((r) => {
                  if (r.needsBarrier) nav.push({ name: "barrier" });
                })
              }
            />
          </>
        ) : null}
        <Button
          label="Sync now"
          onPress={() =>
            void runSync(store, Platform.OS).then((r) => onStatus(r.ok ? "Synced." : `Could not sync: ${r.error}`))
          }
        />
        <Button label="Stop syncing on this device" onPress={() => void store.syncDisconnect()} />
        <Body muted size={13}>Stopping sync keeps your settings here exactly as they are.</Body>
      </Card>
    );
  }

  const connect = async () => {
    const r = await connectSync(store, token, Platform.OS);
    setToken("");
    onStatus(r.ok ? "Signed in. Settings now sync." : `Could not sync: ${r.error}`);
  };

  return (
    <Card>
      <Body strong>Sync</Body>
      <Body>
        Keep the same settings on every computer and phone where Algone runs. Your settings go to one secret Gist in your own GitHub account. There is no Algone server.
      </Body>
      {GITHUB_CLIENT_ID ? <SignIn onStatus={onStatus} /> : null}
      <Body muted size={13}>On GitHub, create a fine-grained token with Gists read and write, and paste it here.</Body>
      <Field
        accessibilityLabel="GitHub token"
        placeholder="GitHub token with the Gist permission"
        value={token}
        onChangeText={setToken}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button label="Connect" disabled={!token.trim()} onPress={() => void connect()} />
      <Body muted size={13}>
        A secret Gist is unlisted, not private: anyone with its link can read it. Algone keeps the sign-in on this device so it can sync. Partner passwords, breaks and the theme never leave this device.
      </Body>
    </Card>
  );
}

function importMessage(r: Result): string {
  if (!r.ok) return `Not imported: ${r.error}`;
  return r.needsBarrier
    ? `${r.applied} stricter settings applied. The looser ones wait for your barrier.`
    : `Imported. ${r.applied} settings changed.`;
}

function SettingsFile({ onStatus }: { onStatus: (text: string) => void }) {
  const nav = useNav();
  const [text, setText] = useState("");

  const doImport = async () => {
    if (text.length > MAX_POLICY_BYTES) return onStatus("That file is too large to be an Algone policy.");
    const r = await store.importPolicy(text, Platform.OS);
    onStatus(importMessage(r));
    if (r.ok) setText("");
    if (r.needsBarrier) nav.push({ name: "barrier" });
  };

  return (
    <Card>
      <Body strong>Settings file</Body>
      <Body>
        One file holds every setting that applies on all your devices. You, or an assistant you trust, can edit it and import it anywhere Algone runs.
      </Body>
      <Body muted size={13}>
        Importing is never a shortcut: stricter settings apply at once, looser ones wait for your barrier on this device. Your theme, breaks and partner password stay on this device.
      </Body>
      <Button
        kind="primary"
        label="Export settings"
        onPress={() => void Share.share({ title: "algone-policy.json", message: store.exportPolicy() }).catch(() => undefined)}
      />
      <Field
        accessibilityLabel="Settings file to import"
        placeholder="Paste a settings file here"
        value={text}
        onChangeText={setText}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button label="Import settings" disabled={!text.trim()} onPress={() => void doImport()} />
    </Card>
  );
}

export function SyncScreen() {
  const [status, setStatus] = useState("");
  return (
    <Screen title="Sync and settings file">
      <Account onStatus={setStatus} />
      {status ? <Body>{status}</Body> : null}
      <SettingsFile onStatus={setStatus} />
    </Screen>
  );
}
