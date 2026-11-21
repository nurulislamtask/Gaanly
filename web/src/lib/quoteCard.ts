import type { Track } from "./types";

/** Wraps text into lines that fit `max` pixels. */
function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function load(url: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/** A square picture of one lyric line over the song's blurred cover, ready to share. */
export async function quoteCard(line: string, track: Track): Promise<Blob> {
  const S = 1080;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const art = await load(track.art || track.thumb);

  g.fillStyle = "#0d2a57";
  g.fillRect(0, 0, S, S);
  if (art) {
    g.filter = "blur(40px) saturate(1.3)";
    g.drawImage(art, -120, -120, S + 240, S + 240);
    g.filter = "none";
  }
  const shade = g.createLinearGradient(0, 0, 0, S);
  shade.addColorStop(0, "rgba(0,0,0,0.35)");
  shade.addColorStop(1, "rgba(0,0,0,0.75)");
  g.fillStyle = shade;
  g.fillRect(0, 0, S, S);

  const font = "system-ui, -apple-system, 'Segoe UI', 'Noto Sans Bengali', 'Noto Sans', sans-serif";
  g.fillStyle = "#fff";
  g.textBaseline = "alphabetic";
  let size = 78;
  let lines: string[] = [];
  for (; size >= 40; size -= 6) {
    g.font = `700 ${size}px ${font}`;
    lines = wrap(g, line, S - 200);
    if (lines.length * size * 1.25 < 520) break;
  }
  const height = lines.length * size * 1.25;
  let y = 300 + (520 - height) / 2 + size;
  for (const l of lines) {
    g.fillText(l, 100, y);
    y += size * 1.25;
  }

  const cover = 120;
  if (art) {
    g.save();
    g.beginPath();
    g.roundRect(100, S - 230, cover, cover, 20);
    g.clip();
    g.drawImage(art, 100, S - 230, cover, cover);
    g.restore();
  }
  g.font = `700 38px ${font}`;
  g.fillText(track.title.slice(0, 34), 100 + cover + 28, S - 175);
  g.fillStyle = "rgba(255,255,255,0.72)";
  g.font = `500 30px ${font}`;
  g.fillText(track.artist.slice(0, 40), 100 + cover + 28, S - 128);
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.font = `600 26px ${font}`;
  g.fillText("Gaanly", S - 190, 90);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("picture failed"))), "image/png"));
}

/** Shares the picture (the system share sheet when there is one), else saves it as a download. */
export async function shareImage(blob: Blob, name: string) {
  const file = new File([blob], `${name}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `${name}.png` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
