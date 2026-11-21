import { usePlayer } from "./player";

/**
 * Skips the parts of a YouTube video that aren't music (talking intros, sponsor reads, self-promotion), using the
 * community-made SponsorBlock database. Only plain videos have such parts; songs from YouTube Music have none.
 */
interface Segment {
  start: number;
  end: number;
}

const cache = new Map<string, Segment[]>();
const pending = new Set<string>();

async function load(id: string): Promise<Segment[]> {
  const hit = cache.get(id);
  if (hit) return hit;
  if (pending.has(id)) return [];
  pending.add(id);
  let segments: Segment[] = [];
  try {
    const categories = encodeURIComponent(JSON.stringify(["music_offtopic", "sponsor", "selfpromo", "intro", "outro"]));
    const res = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${id}&categories=${categories}`);
    if (res.ok) {
      const data = (await res.json()) as { segment?: [number, number]; actionType?: string }[];
      segments = data
        .filter((d) => Array.isArray(d.segment) && (!d.actionType || d.actionType === "skip"))
        .map((d) => ({ start: d.segment![0], end: d.segment![1] }));
    }
  } catch {
    /* offline, or the service is down: play everything */
  }
  pending.delete(id);
  cache.set(id, segments);
  return segments;
}

const KEY = "gaanly:sponsorblock";
export const sponsorBlockOn = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};
export const setSponsorBlock = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable */
  }
};

let started = false;
/** Starts watching playback; call once. */
export function startSponsorBlock(): void {
  if (started) return;
  started = true;
  let lastId: string | undefined;
  usePlayer.subscribe((s) => {
    const track = s.queue[s.index];
    if (!track || track.kind !== "video" || !sponsorBlockOn()) return;
    if (track.id !== lastId) {
      lastId = track.id;
      void load(track.id);
    }
    const hit = cache.get(track.id)?.find((g) => s.position >= g.start && s.position < g.end - 0.3);
    // Only skip when playback runs into the segment on its own, not when the person seeks into it on purpose.
    if (hit && s.status === "playing" && s.position - hit.start < 1.5 && hit.end - hit.start > 2) s.seek(hit.end);
  });
}
