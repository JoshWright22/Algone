type Child = Node | string | number | false | null | undefined;
type Props = Record<string, unknown> & { class?: string; onclick?: (e: MouseEvent) => void };

/** A tiny DOM helper. Text always goes through text nodes, so fetched text stays inert. */
export function h(tag: string, props: Props = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2), v as EventListener);
    } else if (k === "value") {
      (el as HTMLInputElement).value = String(v);
    } else if (k === "checked" || k === "disabled") {
      (el as HTMLInputElement)[k] = Boolean(v);
    } else {
      el.setAttribute(k === "class" ? "class" : k, v === true ? "" : String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function mount(root: HTMLElement, ...nodes: Child[]): void {
  root.replaceChildren(...nodes.filter((n): n is Node | string => !!n).map((n) =>
    typeof n === "number" ? String(n) : n,
  ) as Array<Node | string>);
}

export function toggle(checked: boolean, onchange: (next: boolean) => void, label: string): HTMLElement {
  return h(
    "label",
    { class: "switch" },
    h("input", {
      type: "checkbox",
      checked,
      "aria-label": label,
      onchange: (e: Event) => onchange((e.target as HTMLInputElement).checked),
    }),
    h("span", { class: "track", "aria-hidden": "true" }),
  );
}

/** Sets the theme attribute, and keeps it in step with the system when set to system. */
export function applyTheme(theme: string): void {
  const dark =
    theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
