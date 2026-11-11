import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface AlgoneA11y {
  setRules(json: string): void;
  isEnabled(): boolean;
  openSettings(): void;
}

/** Android only. Absent on iPhone, in Expo Go, and in tests: callers check for null. */
export const a11y: AlgoneA11y | null = Platform.OS === "android" ? requireOptionalNativeModule<AlgoneA11y>("AlgoneA11y") : null;
