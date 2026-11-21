import { useT } from "../i18n";
import { cn } from "../lib/format";
import { EQ_BANDS } from "../player/effects";
import { PRESETS, useEqualizer } from "../stores/equalizer";
import { Modal } from "./Modal";

const label = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : String(hz));

/** The frequency response the sliders add up to, drawn as a smooth curve. */
function Curve({ gains, on }: { gains: number[]; on: boolean }) {
  const W = 300;
  const H = 70;
  const pts = gains.map((g, i) => [(i / 9) * W, H / 2 - (g / 12) * (H / 2 - 6)] as const);
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    d += ` C ${(x0 + x1) / 2} ${y0}, ${(x0 + x1) / 2} ${y1}, ${x1} ${y1}`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-20 w-full rounded-[18px] bg-surface-1 px-2 ring-1 ring-line", !on && "opacity-50")} preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 4" />
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="var(--accent)" fillOpacity="0.14" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />
      ))}
    </svg>
  );
}

/** Ten-band equaliser with presets. */
export function EqualizerDialog() {
  const t = useT();
  const eq = useEqualizer();
  return (
    <Modal open={eq.open} onClose={() => eq.setOpen(false)} title={t.listen.equalizer}>
      <div className="flex flex-col gap-4">
        <label className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-1 px-4 py-3 ring-1 ring-line">
          <span className="text-sm font-medium">{t.listen.eqOn}</span>
          <input type="checkbox" checked={eq.enabled} onChange={(e) => eq.setEnabled(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        </label>

        {!eq.supported && <p className="rounded-[12px] bg-surface-1 px-3 py-2 text-xs text-fg-2 ring-1 ring-line">{t.listen.eqUnsupported}</p>}

        <div className="flex flex-wrap gap-1.5">
          {Object.keys(PRESETS).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => eq.setPreset(id)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium ring-1 transition-colors",
                eq.preset === id ? "bg-accent-soft text-accent-text ring-accent/40" : "text-fg-2 ring-line hover:text-fg",
              )}
            >
              {t.listen.eqPresets[id as keyof typeof t.listen.eqPresets]}
            </button>
          ))}
        </div>

        <Curve gains={eq.gains} on={eq.enabled} />

        <div className={cn("grid grid-cols-10 gap-0.5 rounded-[20px] bg-surface-1 px-1 py-3 ring-1 ring-line", !eq.enabled && "opacity-50")}>
          {EQ_BANDS.map((hz, i) => (
            <label key={hz} className="flex flex-col items-center gap-1 text-[10px] text-fg-2">
              <span className="font-mono tabular-nums">{eq.gains[i]! > 0 ? "+" : ""}{eq.gains[i]}</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={eq.gains[i]}
                onChange={(e) => eq.setGain(i, Number(e.target.value))}
                onDoubleClick={() => eq.setGain(i, 0)}
                aria-label={`${label(hz)} Hz`}
                style={{ writingMode: "vertical-lr", direction: "rtl", height: 150, width: 28 }}
                className="accent-[var(--accent)]"
              />
              <span className="font-mono">{label(hz)}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => eq.setPreset("flat")} className="h-9 rounded-xl bg-surface-2 px-3 text-xs font-medium ring-1 ring-line">
            {t.listen.eqFlat}
          </button>
          <button type="button" onClick={() => eq.nudge([2, 2, 2, 1, 0, 0, 0, 0, 0, 0])} className="h-9 rounded-xl bg-surface-2 px-3 text-xs font-medium ring-1 ring-line">
            {t.listen.eqBassPlus}
          </button>
          <button type="button" onClick={() => eq.nudge([0, 0, 0, 0, 0, 0, 1, 2, 2, 2])} className="h-9 rounded-xl bg-surface-2 px-3 text-xs font-medium ring-1 ring-line">
            {t.listen.eqTreblePlus}
          </button>
        </div>
      </div>
    </Modal>
  );
}
