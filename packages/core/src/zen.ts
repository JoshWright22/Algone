import type { SiteRule } from "@algone/rules";
import { isHidden } from "./defaults";
import type { Settings } from "./types";

/**
 * Builds an adblock-style filter list for Zen (github.com/irbis-sh/zen-desktop), so apps
 * and browsers without the extension hide the same feeds. Only plain `##` hide rules are
 * written: no network rules, no scriptlets, nothing Zen would run as code.
 *
 * Left out, and listed in the header instead:
 * - elements limited to some pages (Zen has no page check, so they could hide too much),
 * - elements that work by an effect (such as stopping autoplay), which only the extension can do.
 * Modes, barriers and snoozes do not exist in Zen: the list is the No feed view.
 */
export interface ZenList {
  text: string;
  rules: number;
  skipped: string[];
}

/** Characters that would let a selector become more than a hide rule in adblock syntax. */
const UNSAFE = /[{}\\\r\n]|#[@?$%]?#|\$\$|@@|:style\(|:remove\(|:-abp-|^\s*$|^\s*(\+js\(|\^|!|\[\$)/;

export function zenList(settings: Settings, rules: SiteRule[], generatedAt: string): ZenList {
  const lines: string[] = [];
  const skipped: string[] = [];
  for (const rule of rules) {
    const site = settings.sites[rule.id];
    if (!site?.enabled) continue;
    const hosts = rule.hosts.join(",");
    for (const el of rule.elements) {
      const hidden = isHidden(el, site);
      // In Tuned mode the extension shows the feed with filters; Zen cannot filter, so it shows it.
      if (!hidden || (site.mode === "tuned" && el.feed)) continue;
      if (el.routes?.length || el.effect) {
        skipped.push(`${rule.id}.${el.id}`);
        continue;
      }
      for (const selector of el.selectors) {
        if (UNSAFE.test(selector)) {
          skipped.push(`${rule.id}.${el.id}`);
          continue;
        }
        lines.push(`${hosts}##${selector}`);
      }
    }
  }
  const unique = [...new Set(lines)];
  const header = [
    "! Title: Algone",
    "! Description: Hides algorithmic feeds, made from your Algone settings. Hide rules only.",
    "! Expires: 1 hour",
    `! Generated: ${generatedAt}`,
    "! Homepage: https://joshwright22.github.io/Algone/",
    ...(skipped.length ? [`! Not possible in Zen: ${[...new Set(skipped)].join(", ")}`] : []),
  ];
  return { text: `${[...header, ...unique].join("\n")}\n`, rules: unique.length, skipped: [...new Set(skipped)] };
}
