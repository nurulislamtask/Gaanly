// Sets one version everywhere: node scripts/set-version.mjs 1.2.0
// package.json files (the Android app reads the root one for its versionName/versionCode) and the iOS project.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2]?.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("Usage: node scripts/set-version.mjs 1.2.3");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of ["package.json", "desktop/package.json", "server/package.json", "web/package.json", "mobile/package.json"]) {
  const path = join(root, file);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.version = version;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
}

const [major, minor, patch] = version.split(".").map(Number);
const pbx = join(root, "mobile/ios/App/App.xcodeproj/project.pbxproj");
writeFileSync(
  pbx,
  readFileSync(pbx, "utf8")
    .replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${major * 10000 + minor * 100 + patch};`),
);
console.log(`Version is now ${version}`);
