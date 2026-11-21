import { useT } from "../i18n";
import { cn } from "../lib/format";
import { EQ_BANDS } from "../player/effects";
import { PRESETS, useEqualizer } from "../stores/equalizer";
import { Modal } from "./Modal";

const label = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : String(hz));

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

        <div className={cn("flex flex-col gap-1.5", !eq.enabled && "opacity-50")}>
          {EQ_BANDS.map((hz, i) => (
            <label key={hz} className="grid grid-cols-[34px_1fr_40px] items-center gap-3 text-xs text-fg-2">
              <span className="font-mono">{label(hz)}</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={eq.gains[i]}
                onChange={(e) => eq.setGain(i, Number(e.target.value))}
                aria-label={`${label(hz)} Hz`}
                className="h-6 w-full accent-[var(--accent)]"
              />
              <span className="text-right font-mono tabular-nums">{eq.gains[i]! > 0 ? "+" : ""}{eq.gains[i]} dB</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
