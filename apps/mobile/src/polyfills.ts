import { getRandomValues } from "expo-crypto";

// Hermes has no `crypto`. packages/core uses it for the partner barrier's salt.
const g = globalThis as unknown as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto?.getRandomValues) g.crypto = { ...g.crypto, getRandomValues };
