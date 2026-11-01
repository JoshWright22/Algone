import { barrierStep, COPY, ESCAPE_WAIT_SECONDS, verifyPassword, webKdf } from "@algone/core";
import { api, now } from "../browser";
import { send } from "../messages";
import { loadState } from "../state";
import { applyTheme, h, mount } from "./h";

const root = document.getElementById("root")!;
let timer: ReturnType<typeof setInterval> | undefined;

async function leave(cancel: boolean): Promise<void> {
  if (cancel) await send({ t: "barrierCancel" });
  await send({ t: "closeTab" });
}

function neverMind(): HTMLElement {
  return h("button", { class: "primary big", id: "never-mind", autofocus: true, onclick: () => void leave(true) }, "Never mind");
}

async function pass(): Promise<void> {
  const r = await send({ t: "barrierPass" });
  if (r.ok) await send({ t: "closeTab" });
  else mount(root, card("Could not unlock", h("p", {}, r.error ?? "Try again."), neverMind()));
}

function card(title: string, ...children: Array<HTMLElement | string>): HTMLElement {
  return h("main", { class: "card" }, h("h1", {}, title), ...children);
}

/** A countdown that only runs while this tab has focus. */
function countdown(seconds: number, label: string, done: () => void, note: string): void {
  let left = seconds;
  const count = h("div", { class: "count", role: "timer", "aria-live": "polite" }, String(left));
  const go = h("button", { class: "ghost", id: "continue", disabled: true, onclick: done }, "Continue");
  const hint = h("p", { class: "muted" }, note);
  mount(root, card(label, count, hint, neverMind(), go, h("p", { class: "muted small" }, COPY.uninstall)));
  clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hasFocus() && !TEST_HOOKS) {
      hint.textContent = "The timer pauses while this tab is in the background.";
      return;
    }
    left -= 1;
    count.textContent = String(Math.max(left, 0));
    if (left <= 0) {
      clearInterval(timer);
      (go as HTMLButtonElement).disabled = false;
      count.textContent = "Done";
    }
  }, 1000);
}

function typing(text: string, label: string): void {
  const input = h("textarea", {
    id: "typing",
    rows: 3,
    spellcheck: "false",
    autocomplete: "off",
    "aria-label": "Type the text above",
    onpaste: (e: Event) => e.preventDefault(),
    ondrop: (e: Event) => e.preventDefault(),
  }) as HTMLTextAreaElement;
  const progress = h("p", { class: "muted" }, `0 of ${text.length}`);
  const go = h("button", { class: "ghost", id: "continue", disabled: true, onclick: () => void pass() }, "Continue");
  input.addEventListener("input", () => {
    const n = [...input.value].filter((c, i) => c === text[i]).length;
    progress.textContent = `${n} of ${text.length}`;
    (go as HTMLButtonElement).disabled = input.value !== text;
  });
  mount(root, card(label, h("pre", { class: "challenge", id: "challenge" }, text), input, progress, neverMind(), go));
}

async function render(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  const pending = state.runtime.pending;
  if (!pending) {
    mount(root, card("Nothing is waiting", h("p", {}, "You can close this tab.")));
    return;
  }
  const step = barrierStep(state.settings.barrier, state.runtime, now());
  const label = pending.label;
  if (step.kind === "wait") {
    countdown(step.seconds, label, () => void pass(), "Take a breath. What did you come here to do?");
  } else if (step.kind === "typing") {
    typing(step.text, label);
  } else if (step.kind === "password") {
    const input = h("input", { type: "password", id: "password", "aria-label": "Password", autocomplete: "off" }) as HTMLInputElement;
    const error = h("p", { class: "muted", role: "alert" });
    const check = async () => {
      const b = state.settings.barrier;
      if (b.type === "partner" && (await verifyPassword(input.value, b, webKdf))) await pass();
      else error.textContent = "That is not the password.";
    };
    mount(
      root,
      card(
        label,
        h("p", {}, "Ask your partner to enter the password."),
        input,
        error,
        neverMind(),
        h("button", { class: "ghost", id: "continue", onclick: () => void check() }, "Continue"),
        h("button", {
          class: "ghost",
          id: "forgot",
          onclick: () => void send({ t: "barrierRecover" }).then(render),
        }, "Forgot the password (starts a 24 hour wait)"),
      ),
    );
  } else {
    const when = step.until ? new Date(step.until).toLocaleString() : "";
    const escape = step.canEscape
      ? h("button", {
          class: "ghost",
          id: "escape",
          onclick: () =>
            countdown(ESCAPE_WAIT_SECONDS, "Use your one escape", () => {
              void send({ t: "barrierEscape" }).then(() => send({ t: "closeTab" }));
            }, "This lock allows one escape. It cannot be used again."),
        }, "Use your one escape")
      : null;
    mount(
      root,
      card(
        "Not available right now",
        h("p", {}, step.reason),
        when ? h("p", { class: "muted", id: "until" }, `Available again: ${when}`) : "",
        neverMind(),
        ...(escape ? [escape] : []),
        h("p", { class: "muted small" }, COPY.uninstall),
      ),
    );
  }
}

void render();
void api;
