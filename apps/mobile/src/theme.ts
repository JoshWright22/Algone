import { useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { store } from "./store";

const dark = {
  scheme: "dark" as "dark" | "light",
  bg: "#0b0b0f",
  surface: "#ffffff0a",
  surfaceStrong: "#ffffff14",
  border: "#ffffff14",
  text: "#f1f1f4",
  muted: "#a0a0ac",
  accent: "#7c8cff",
  accentInk: "#0d0d12",
  warn: "#f2b84b",
};

const light: typeof dark = {
  scheme: "light",
  bg: "#f7f7f9",
  surface: "#0000000a",
  surfaceStrong: "#00000014",
  border: "#00000014",
  text: "#14141c",
  muted: "#5c5c68",
  accent: "#4f5fe0",
  accentInk: "#ffffff",
  warn: "#8a5a00",
};

export const RADIUS = 12;
export type Colors = typeof dark;

export function useStored() {
  return useSyncExternalStore(store.subscribe, store.get);
}

/** Dark first: "system" with no known scheme stays dark. */
export function useColors(): Colors {
  const system = useColorScheme();
  const { theme } = useStored().settings;
  return (theme === "system" ? system : theme) === "light" ? light : dark;
}
