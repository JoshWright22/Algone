import facebook from "../apps/facebook.json" with { type: "json" };
import instagram from "../apps/instagram.json" with { type: "json" };
import reddit from "../apps/reddit.json" with { type: "json" };
import tiktok from "../apps/tiktok.json" with { type: "json" };
import youtube from "../apps/youtube.json" with { type: "json" };
import { VERIFY_METHODS, type VerifyMethod } from "./schema";

/**
 * Native-app rules for Android: data, like site rules. The Algone app's Accessibility
 * service reads the open screen's view ids and labels, matches them against these, and
 * backs out or goes home. It never reads post text and never sends anything anywhere.
 */
export type AppAction = "back" | "home";
export type AppScreenKind = "feed" | "shortVideo";

export interface AppScreen {
  id: string;
  label: string;
  kind: AppScreenKind;
  action: AppAction;
  /** Any listed view id (without the package prefix) or content description present, or always. */
  match: { viewIds?: string[]; descriptions?: string[]; always?: boolean };
}

export interface AppRule {
  id: string;
  name: string;
  packages: string[];
  screens: AppScreen[];
  verified: { date: string; method: VerifyMethod; notes: string };
}

export const APPS = [youtube, instagram, facebook, tiktok, reddit] as unknown as AppRule[];

const ID = /^[a-z][a-zA-Z0-9]{0,40}$/;
const PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const VIEW_ID = /^[a-z][a-z0-9_]{0,80}$/;

export function validateApp(app: AppRule): string[] {
  const errors: string[] = [];
  if (!ID.test(app.id)) errors.push(`bad id ${app.id}`);
  if (!app.name) errors.push("missing name");
  if (!app.packages.length || !app.packages.every((p) => PACKAGE.test(p))) errors.push("bad package names");
  const seen = new Set<string>();
  for (const s of app.screens) {
    const at = `${app.id}.${s.id}`;
    if (!ID.test(s.id) || seen.has(s.id)) errors.push(`${at}: bad or repeated id`);
    seen.add(s.id);
    if (s.kind !== "feed" && s.kind !== "shortVideo") errors.push(`${at}: kind must be feed or shortVideo`);
    if (s.action !== "back" && s.action !== "home") errors.push(`${at}: action must be back or home`);
    const m = s.match ?? {};
    const any = (m.viewIds?.length ?? 0) + (m.descriptions?.length ?? 0) + (m.always ? 1 : 0);
    if (!any) errors.push(`${at}: needs viewIds, descriptions or always`);
    if (m.viewIds?.some((v) => !VIEW_ID.test(v))) errors.push(`${at}: view ids are lower-case names without the package`);
    if (m.descriptions?.some((d) => !d || d.length > 60)) errors.push(`${at}: descriptions are short labels`);
  }
  if (!VERIFY_METHODS.includes(app.verified?.method)) errors.push("bad verified.method");
  return errors;
}
