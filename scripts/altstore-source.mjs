// Writes the AltStore / SideStore "source" for a release: iPhone users add it once
//   https://github.com/<owner>/Gaanly/releases/latest/download/altstore.json
// and from then on AltStore/SideStore offer every new Gaanly version as an update by themselves.
// Usage: node scripts/altstore-source.mjs <repo> <version> <downloads-dir> <out-file>
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [repo, rawVersion, dir, out] = process.argv.slice(2);
const version = rawVersion.replace(/^v/, "");
const ipa = readdirSync(dir).find((f) => f.endsWith("-iOS.ipa"));
if (!ipa) throw new Error(`No iOS .ipa in ${dir}`);
const size = statSync(join(dir, ipa)).size;
const base = `https://github.com/${repo}/releases`;
const date = new Date().toISOString().slice(0, 10);
const description = "A music player for YouTube's catalog: songs, albums and videos, with no ads and no account.";

const source = {
  name: "Gaanly",
  identifier: "app.gaanly.source",
  subtitle: "Your music, uninterrupted.",
  description,
  sourceURL: `${base}/latest/download/altstore.json`,
  iconURL: `https://raw.githubusercontent.com/${repo}/main/web/public/icon-512.png`,
  tintColor: "12A59A",
  apps: [
    {
      name: "Gaanly",
      bundleIdentifier: "app.gaanly.ios",
      developerName: "Gaanly",
      subtitle: "Your music, uninterrupted.",
      localizedDescription: description,
      iconURL: `https://raw.githubusercontent.com/${repo}/main/web/public/icon-512.png`,
      tintColor: "12A59A",
      category: "entertainment",
      screenshotURLs: [],
      versions: [
        {
          version,
          date,
          localizedDescription: `Gaanly ${version}. Details: ${base}/tag/v${version}`,
          downloadURL: `${base}/download/v${version}/${ipa}`,
          size,
          minOSVersion: "15.0",
        },
      ],
      // Older AltStore versions read these instead of "versions".
      version,
      versionDate: date,
      versionDescription: `Gaanly ${version}`,
      downloadURL: `${base}/download/v${version}/${ipa}`,
      size,
    },
  ],
  news: [],
};
writeFileSync(out, JSON.stringify(source, null, 2) + "\n");
console.log(`Wrote ${out} for ${ipa} (${size} bytes)`);
