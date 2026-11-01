import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as { REMOTE_RULES?: boolean; BUILD_REV?: number };

export const rulesConfig = {
  remote: extra.REMOTE_RULES === true,
  buildRev: extra.BUILD_REV ?? 0,
};
