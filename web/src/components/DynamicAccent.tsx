import { useEffect } from "react";
import { accentCss } from "../lib/accent";
import { selectCurrent, usePlayer } from "../player/player";
import { useAppearance } from "../stores/appearance";

/** The most colourful, not-too-dark/light colour of a picture, found on a tiny copy of it. */
async function dominant(url: string): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(img, 0, 0, 24, 24);
    const px = g.getImageData(0, 0, 24, 24).data;
    let best: [number, number, number] | null = null;
    let bestScore = -1;
    for (let i = 0; i < px.length; i += 4) {
      const [r, gr, b] = [px[i]!, px[i + 1]!, px[i + 2]!];
      const max = Math.max(r, gr, b);
      const min = Math.min(r, gr, b);
      const light = (max + min) / 510;
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      const score = sat * (1 - Math.abs(light - 0.55));
      if (score > bestScore) {
        bestScore = score;
        best = [r, gr, b];
      }
    }
    if (!best || bestScore < 0.12) return null;
    return `#${best.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return null; // a picture the browser won't let us read: keep the current colour
  }
}

/** With "Colours from the cover" on, the accent follows the playing song. */
export function DynamicAccent() {
  const on = useAppearance((s) => s.dynamic);
  const art = usePlayer((s) => selectCurrent(s)?.art);

  useEffect(() => {
    const id = "gaanly-dynamic";
    document.getElementById(id)?.remove();
    if (!on || !art) return;
    let stale = false;
    void dominant(art).then((hex) => {
      if (stale || !hex) return;
      const style = Object.assign(document.createElement("style"), { id, textContent: accentCss(hex) });
      document.head.appendChild(style);
    });
    return () => {
      stale = true;
    };
  }, [on, art]);

  useEffect(() => () => document.getElementById("gaanly-dynamic")?.remove(), []);
  return null;
}
