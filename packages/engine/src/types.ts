import type { Capture, EffectName, Player, Routes, Slot, Tuned } from "@algone/rules";
import type { View } from "@algone/core";

export interface PageEffect {
  id: string;
  effect: EffectName;
  selector?: string;
}

/** The part of a rule page code needs. Built from the bundled rule plus any overlay. */
export interface PageSite {
  id: string;
  routes: Routes;
  tuned?: Tuned;
  player?: Player;
  slot?: Slot;
  effects: PageEffect[];
  subscriptionsPath?: string;
  capture?: Capture;
}

export interface PagePayload {
  site: PageSite;
  view: View;
  overlayCss: string;
}

export type Hint =
  | { type: "route"; path: string }
  | { type: "videoEnded" }
  | { type: "injectionOk" };

export type PanelKind = "feed" | "launch" | "ended" | "save" | "notice";

export interface CapturedItem {
  title: string;
  url: string;
}

export interface PageHost {
  payload(): Promise<PagePayload>;
  onPayload(cb: (p: PagePayload) => void): void;
  applyCss(css: string): Promise<boolean>;
  hint(h: Hint): void;
  /** Extension only. Absent on mobile, where these surfaces are native screens. */
  extension?: {
    panelUrl(kind: PanelKind): string;
    capture(items: CapturedItem[]): void;
  };
}
