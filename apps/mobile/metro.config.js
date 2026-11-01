// apps/mobile sits outside the root npm workspaces. Metro reads the shared TypeScript
// packages from ../../packages, and every npm dependency from apps/mobile/node_modules.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const packagesRoot = path.resolve(projectRoot, "../../packages");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), packagesRoot];
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "@algone/core": path.join(packagesRoot, "core"),
  "@algone/engine": path.join(packagesRoot, "engine"),
  "@algone/rules": path.join(packagesRoot, "rules"),
};

module.exports = config;
