import { isHidden, type Mode, type SiteSettings } from "@algone/core";
import type { SiteRule } from "@algone/rules";
import { send } from "../messages";
import { h, toggle } from "./h";

export const MODES: Array<{ id: Mode; label: string; hint: string }> = [
  { id: "healthy", label: "Healthy", hint: "A short batch from the site's own picks, without ragebait. Then it ends" },
  { id: "nofeed", label: "No feed", hint: "Clean empty space" },
  { id: "random", label: "Random", hint: "Quotes, facts, poems, art, puzzles" },
  { id: "tuned", label: "Tuned", hint: "The site's feed, with your filters" },
  { id: "custom", label: "Custom", hint: "Your own feed, stored on this device" },
];

export function modePicker(rule: SiteRule, site: SiteSettings): HTMLElement {
  return h(
    "div",
    { class: "modes", role: "radiogroup", "aria-label": `Mode for ${rule.name}` },
    ...MODES.map((m) =>
      h(
        "button",
        {
          class: site.mode === m.id ? "mode active" : "mode",
          role: "radio",
          "aria-checked": String(site.mode === m.id),
          title: m.hint,
          "data-mode": m.id,
          onclick: () => void send({ t: "patch", patch: { op: "setMode", site: rule.id, mode: m.id } }),
        },
        m.label,
      ),
    ),
  );
}

export function elementList(rule: SiteRule, site: SiteSettings): HTMLElement {
  const groups = new Map<string, SiteRule["elements"]>();
  for (const el of rule.elements) groups.set(el.group, [...(groups.get(el.group) ?? []), el]);
  return h(
    "div",
    { class: "elements" },
    ...[...groups].map(([group, els]) =>
      h(
        "section",
        {},
        h("h3", {}, group),
        ...els.map((el) => {
          const hidden = isHidden(el, site);
          return h(
            "div",
            { class: "row", "data-element": el.id },
            h("span", {}, el.label),
            toggle(hidden, (next) => {
              void send({ t: "patch", patch: { op: "setElement", site: rule.id, element: el.id, hidden: next } });
            }, `Hide ${el.label}`),
          );
        }),
      ),
    ),
  );
}
