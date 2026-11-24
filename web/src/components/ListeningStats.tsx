import { useT } from "../i18n";
import { useLibrary } from "../stores/library";

/** Totals from the recently played list: songs, artists, minutes and the most played singers. */
export function ListeningStats() {
  const t = useT();
  const history = useLibrary((s) => s.history);
  if (history.length < 3) return null;
  const counts = new Map<string, number>();
  let seconds = 0;
  for (const h of history) {
    seconds += h.duration || 0;
    const a = h.artist.split(/,|&| feat\.? /i)[0]?.trim();
    if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const s = t.library.stats;
  const box = "glass flex flex-1 flex-col rounded-2xl p-3 ring-1 ring-line";
  return (
    <section className="flex flex-col gap-3 px-4 pt-6 md:px-6">
      <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
      <div className="flex gap-2">
        <div className={box}><span className="text-2xl font-semibold">{history.length}</span><span className="text-xs text-fg-3">{s.songs}</span></div>
        <div className={box}><span className="text-2xl font-semibold">{counts.size}</span><span className="text-xs text-fg-3">{s.artists}</span></div>
        <div className={box}><span className="text-2xl font-semibold">{Math.round(seconds / 60)}</span><span className="text-xs text-fg-3">{s.minutes}</span></div>
      </div>
      <p className="text-xs font-medium text-fg-3">{s.top}</p>
      <ol className="flex flex-col gap-1.5">
        {top.map(([name, n]) => (
          <li key={name} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="h-1.5 rounded-full bg-accent" style={{ width: `${(n / top[0]![1]) * 40}%` }} />
            <span className="w-6 text-right text-xs text-fg-3">{n}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
