import type { View } from "@algone/core";

const set = (name: string, tokens: string[]) => {
  const root = document.documentElement;
  const value = tokens.join(" ");
  if (root.getAttribute(name) !== value) root.setAttribute(name, value);
};

export function writeRoute(routes: string[]): void {
  set("data-algone-route", routes);
}

export function writeView(view: View): void {
  set("data-algone-show", view.show);
  set("data-algone-hide", view.hide);
  document.documentElement.setAttribute("data-algone-tuned", view.tuned ? "on" : "off");
  document.documentElement.setAttribute("data-algone-healthy", view.panel?.content === "healthy" ? "on" : "off");
}

export function writeOff(tokens: string[]): void {
  set("data-algone-off", tokens);
}

export function clearAll(): void {
  for (const a of ["show", "hide", "route", "off", "tuned", "fade", "healthy"]) {
    document.documentElement.removeAttribute(`data-algone-${a}`);
  }
}
