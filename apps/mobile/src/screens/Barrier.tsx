import { useEffect, useRef, useState } from "react";
import { AppState, BackHandler } from "react-native";
import { barrierStep, COPY, ESCAPE_WAIT_SECONDS, verifyPassword, type BarrierStep } from "@algone/core";
import { mobileKdf } from "../kdf";
import { useNav } from "../nav";
import { activeBarrier, store } from "../store";
import { useStored } from "../theme";
import { Body, Button, Card, Field, Screen } from "../ui";

function useNeverMind() {
  const nav = useNav();
  return () => {
    nav.pop();
    void store.barrierCancel();
  };
}

function NeverMind() {
  const leave = useNeverMind();
  return <Button kind="primary" label="Never mind" onPress={leave} />;
}

/** Counts down only while the app is in the foreground. */
function useCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") setLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return left;
}

function Wait(props: { seconds: number; note: string; onDone: () => void }) {
  const left = useCountdown(props.seconds);
  return (
    <>
      <Body strong size={40}>{left > 0 ? String(left) : "Done"}</Body>
      <Body muted>{props.note}</Body>
      <Body muted size={13}>The timer pauses while the app is in the background.</Body>
      <NeverMind />
      <Button label="Continue" disabled={left > 0} onPress={props.onDone} />
    </>
  );
}

function Typing({ text, onDone }: { text: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const correct = [...value].filter((c, i) => c === text[i]).length;
  return (
    <>
      <Body mono>{text}</Body>
      <Field
        accessibilityLabel="Type the text above"
        value={value}
        // One keystroke at a time: pasted or suggested text is ignored.
        onChangeText={(next) => {
          if (next.length <= value.length + 2) setValue(next);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        contextMenuHidden
        multiline
      />
      <Body muted>{correct} of {text.length}</Body>
      <NeverMind />
      <Button label="Continue" disabled={value !== text} onPress={onDone} />
    </>
  );
}

function Password({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const check = async () => {
    const b = activeBarrier(store.get().settings.barrier, Date.now());
    setBusy(true);
    const ok = b.type === "partner" && (await verifyPassword(value, b, mobileKdf));
    setBusy(false);
    if (ok) onDone();
    else setError("That is not the password.");
  };

  return (
    <>
      <Body>Ask your partner to enter the password.</Body>
      <Field accessibilityLabel="Password" secureTextEntry value={value} onChangeText={setValue} autoCapitalize="none" />
      {error ? <Body muted>{error}</Body> : null}
      <NeverMind />
      <Button label={busy ? "Checking" : "Continue"} disabled={busy} onPress={() => void check()} />
      <Button
        label="Forgot the password (starts a 24 hour wait)"
        onPress={() => void store.barrierRecover()}
      />
    </>
  );
}

function Blocked({ step, onEscaped }: { step: Extract<BarrierStep, { kind: "blocked" }>; onEscaped: () => void }) {
  const [escaping, setEscaping] = useState(false);
  if (escaping) {
    return (
      <Wait
        seconds={ESCAPE_WAIT_SECONDS}
        note="This lock allows one escape. It cannot be used again."
        onDone={onEscaped}
      />
    );
  }
  return (
    <>
      <Body>{step.reason}</Body>
      {step.until ? <Body muted>Available again: {new Date(step.until).toLocaleString()}</Body> : null}
      <NeverMind />
      {step.canEscape ? <Button label="Use your one escape" onPress={() => setEscaping(true)} /> : null}
    </>
  );
}

export function BarrierScreen() {
  const nav = useNav();
  const leave = useNeverMind();
  const { settings, runtime } = useStored();
  const pending = useRef(runtime.pending).current;
  const barrierKey = JSON.stringify(settings.barrier);
  const [error, setError] = useState("");
  // Worked out once per barrier, so typing text does not change mid-way.
  const stepRef = useRef<{ key: string; step: BarrierStep } | null>(null);
  if (stepRef.current?.key !== barrierKey) {
    stepRef.current = { key: barrierKey, step: barrierStep(settings.barrier, runtime, Date.now()) };
  }
  const step = stepRef.current.step;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      leave();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (work: Promise<{ ok: boolean; error?: string }>) =>
    void work.then((r) => {
      if (r.ok) nav.pop();
      else setError(r.error ?? "Try again.");
    });
  const pass = () => finish(store.barrierPass());

  return (
    <Screen>
      <Card>
        <Body strong size={18}>{step.kind === "blocked" ? "Not available right now" : (pending?.label ?? "")}</Body>
        {error ? <Body muted>{error}</Body> : null}
        {step.kind === "wait" ? (
          <Wait seconds={step.seconds} note="Take a breath. What did you come here to do?" onDone={pass} />
        ) : step.kind === "typing" ? (
          <Typing text={step.text} onDone={pass} />
        ) : step.kind === "password" ? (
          <Password onDone={pass} />
        ) : (
          <Blocked step={step} onEscaped={() => finish(store.barrierEscape())} />
        )}
        <Body muted size={13}>{COPY.uninstall}</Body>
      </Card>
    </Screen>
  );
}
