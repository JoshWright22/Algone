import type { RouteMatcher, Routes } from "@algone/rules";

function pathMatches(pattern: string, path: string): boolean {
  if (pattern.endsWith("*")) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

function matcherMatches(m: RouteMatcher, path: string, search: URLSearchParams): boolean {
  if (typeof m === "string") return pathMatches(m, path);
  if (!pathMatches(m.path, path)) return false;
  return Object.entries(m.query).every(([k, v]) => search.get(k) === v);
}

/** Every route name matching the location. */
export function matchRoutes(routes: Routes, pathname: string, search: string): string[] {
  const params = new URLSearchParams(search);
  return Object.entries(routes)
    .filter(([, list]) => list.some((m) => matcherMatches(m, pathname, params)))
    .map(([name]) => name);
}
