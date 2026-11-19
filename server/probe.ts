// Temporary: prints the shape of YouTube Music's home/charts and Spotify's embed data, so discover.ts reads them right.
import { withClient } from "./src/search.js";

const name = (x: any) => x?.constructor?.name ?? typeof x;
const title = (x: any) => { try { return String(x?.header?.title?.toString?.() ?? x?.title?.toString?.() ?? x?.header?.title?.text ?? ""); } catch { return ""; } };

await withClient(async (yt) => {
  for (const [label, load] of [
    ["explore", () => yt.music.getExplore()],
    ["home", () => yt.music.getHomeFeed()],
  ] as const) {
    try {
      const page: any = await load();
      console.log(`== ${label}: keys`, Object.keys(page));
      for (const s of page.sections ?? []) {
        const first = s.contents?.[0];
        console.log("  section", name(s), JSON.stringify(title(s)), "n=", s.contents?.length, "first=", name(first),
          "|", JSON.stringify(String(first?.title?.toString?.() ?? first?.title ?? first?.name ?? "")), "| id=", first?.id ?? first?.endpoint?.payload?.videoId ?? "");
      }
    } catch (e) { console.log(`== ${label} FAILED`, String(e).slice(0, 300)); }
  }
  for (const id of ["FEmusic_charts", "FEmusic_new_releases_albums", "FEmusic_new_releases"]) {
    try {
      const r: any = await yt.actions.execute("/browse", { browseId: id, client: "YTMUSIC", parse: true });
      const root = typeof r?.contents?.item === "function" ? r.contents.item() : r?.contents;
      const shelves = root?.tabs?.[0]?.content?.contents ?? [];
      console.log(`== ${id}: shelves`, shelves.length);
      for (const s of shelves) {
        const first = (s.contents ?? s.items ?? [])[0];
        console.log("  ", name(s), JSON.stringify(title(s)), "n=", (s.contents ?? s.items ?? []).length, "first=", name(first), "|", JSON.stringify(String(first?.title?.toString?.() ?? first?.title ?? first?.name ?? "")));
      }
    } catch (e) { console.log(`== ${id} FAILED`, String(e).slice(0, 300)); }
  }
});

for (const id of ["37i9dQZEVXbMDoHDwVN2tF", "37i9dQZEVXbLZ52XmnySJg", "37i9dQZF1DXcBWIGoYBM5M"]) {
  try {
    const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36", "accept-language": "en-US,en;q=0.9" } });
    const html = await res.text();
    console.log(`== spotify ${id}: status`, res.status, "len", html.length);
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (!m) { console.log("  no __NEXT_DATA__; head:", html.slice(0, 300).replace(/\s+/g, " ")); continue; }
    const data = JSON.parse(m[1]!);
    const find = (o: any, path = ""): string[] => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => (k === "trackList" ? [`${path}.${k}`] : find(v, `${path}.${k}`))) : []);
    const paths = find(data);
    console.log("  trackList at", paths);
    const get = (p: string) => p.slice(1).split(".").reduce((o: any, k) => o?.[k], data);
    const list = paths[0] ? get(paths[0]) : [];
    console.log("  n=", list.length, "first=", JSON.stringify(list[0]), "| entity name:", JSON.stringify(get(paths[0]!.replace(/\.trackList$/, "")).name ?? get(paths[0]!.replace(/\.trackList$/, "")).title));
  } catch (e) { console.log(`== spotify ${id} FAILED`, String(e).slice(0, 300)); }
}
