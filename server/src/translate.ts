import { config } from "./config.js";

/**
 * Lyrics translation and romanization (a Bangla line written in Latin letters), from Google Translate's public web
 * endpoint: no key, no account. It is an unofficial endpoint, so a failure just means "not available right now".
 */
export interface Translated {
  translation: string[];
  /** The line's sound in Latin letters; empty for lines already in Latin script. */
  romanized: string[];
}

async function one(line: string, to: string): Promise<{ t: string; r: string }> {
  if (!line.trim()) return { t: "", r: "" };
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&dt=rm&ie=UTF-8&oe=UTF-8" +
    `&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(line)}`;
  const res = await (config.fetch ?? fetch)(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36" } });
  if (!res.ok) throw new Error(`Translate answered ${res.status}`);
  const data = (await res.json()) as unknown[][][];
  const parts = Array.isArray(data?.[0]) ? data[0] : [];
  let t = "";
  let r = "";
  for (const p of parts as (string | null)[][]) {
    if (typeof p?.[0] === "string") t += p[0];
    if (typeof p?.[3] === "string") r += p[3];
  }
  return { t: t.trim(), r: r.trim() };
}

const cache = new Map<string, { t: string; r: string }>();

export async function translateLines(lines: string[], to: string): Promise<Translated> {
  const lang = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(to) ? to : "en";
  const out: { t: string; r: string }[] = new Array(lines.length);
  let next = 0;
  let failed = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= lines.length) return;
      const line = lines[i]!.slice(0, 300);
      const key = `${lang}|${line}`;
      try {
        out[i] = cache.get(key) ?? (await one(line, lang));
        cache.set(key, out[i]!);
        if (cache.size > 4000) cache.delete(cache.keys().next().value!);
      } catch {
        failed++;
        out[i] = { t: "", r: "" };
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (failed === lines.filter((l) => l.trim()).length && failed > 0) throw new Error("Translation is not available right now.");
  return {
    translation: out.map((o) => o.t),
    romanized: out.map((o, i) => (o.r && o.r.toLowerCase() !== lines[i]!.toLowerCase() ? o.r : "")),
  };
}
