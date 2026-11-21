import { CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import { useT } from "../i18n";
import { inkFor } from "../lib/accent";
import { cn } from "../lib/format";
import { ACCENTS, PALETTES, useAppearance } from "../stores/appearance";
import { useUi } from "../stores/ui";

/** Ready-made accent swatches plus any colour from the system picker. */
export function AccentPicker() {
  const t = useT();
  const accent = useAppearance((s) => s.accent);
  const set = useAppearance((s) => s.set);
  const custom = !ACCENTS.some((a) => a.color === accent);
  const swatch = "grid size-8 shrink-0 place-items-center rounded-full ring-offset-2 ring-offset-surface-2 transition-transform active:scale-90";

  return (
    <div className="flex flex-col gap-2 pt-1">
      <p className="text-[13px] text-fg-2">{t.customize.accent}</p>
      <div role="radiogroup" aria-label={t.customize.accent} className="flex flex-wrap items-center gap-2.5">
        {ACCENTS.map(({ id, color }) => {
          const on = accent === color;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.customize.colors[id]}
              title={t.customize.colors[id]}
              onClick={() => set({ accent: color })}
              className={cn(swatch, on && "ring-2 ring-fg")}
              style={{ background: color }}
            >
              {on && <CheckIcon size={15} weight="bold" style={{ color: inkFor(color) }} />}
            </button>
          );
        })}
        <label
          title={t.customize.customColor}
          className={cn(swatch, "relative cursor-pointer", custom && "ring-2 ring-fg")}
          style={{ background: custom ? accent : "conic-gradient(#f43f5e, #fbbf24, #a3e635, #22d3ee, #6366f1, #d946ef, #f43f5e)" }}
        >
          <input
            type="color"
            value={accent}
            onChange={(e) => set({ accent: e.target.value })}
            aria-label={t.customize.customColor}
            className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
          />
          {custom ? (
            <CheckIcon size={15} weight="bold" style={{ color: inkFor(accent) }} />
          ) : (
            <PaletteIcon size={15} weight="bold" className="text-white drop-shadow" />
          )}
        </label>
      </div>
    </div>
  );
}

function SwitchRow({ label, body, checked, onChange }: { label: string; body?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {body && <span className="block text-xs text-fg-2">{body}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-surface-4",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-4 rounded-full transition-transform duration-200 ease-out-expo",
            checked ? "translate-x-4 bg-accent-ink" : "bg-fg-2",
          )}
        />
      </span>
    </label>
  );
}

/** What the app shows: panels, sidebar, list columns and the Home sections. */
export function LayoutSection() {
  const t = useT();
  const a = useAppearance();
  const panelOpen = useUi((s) => s.panelOpen);
  const setPanelDocked = useUi((s) => s.setPanelDocked);

  const homeSections = [
    ["homeShortcuts", t.customize.homeShortcuts],
    ["homeRecent", t.nav.recentlyPlayed],
    ["homeFavorites", t.home.yourFavorites],
  ] as const;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-fg-3">{t.customize.layout}</h3>
      <div className="flex flex-col divide-y divide-line rounded-[16px] bg-surface-1 ring-1 ring-line">
        <SwitchRow label={t.customize.panel} body={t.customize.panelBody} checked={panelOpen} onChange={setPanelDocked} />
        <SwitchRow label={t.customize.sidebarPlaylists} checked={a.sidebarPlaylists} onChange={(v) => a.set({ sidebarPlaylists: v })} />
        <SwitchRow
          label={t.customize.compactSidebar}
          body={t.customize.compactSidebarBody}
          checked={a.compactSidebar}
          onChange={(v) => a.set({ compactSidebar: v })}
        />
        <SwitchRow label={t.customize.albumColumn} checked={a.albumColumn} onChange={(v) => a.set({ albumColumn: v })} />
        <SwitchRow label={t.customize.glass} body={t.customize.glassBody} checked={a.glass} onChange={(v) => a.set({ glass: v })} />
        <SwitchRow label={t.customize.dynamic} body={t.customize.dynamicBody} checked={a.dynamic} onChange={(v) => a.set({ dynamic: v })} />
        <SwitchRow label={t.customize.texture} checked={a.texture} onChange={(v) => a.set({ texture: v })} />
      </div>

      <p className="pt-2 text-[13px] text-fg-2">{t.customize.home}</p>
      <div className="flex flex-wrap gap-2">
        {homeSections.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={a[key]}
            onClick={() => a.set({ [key]: !a[key] })}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors",
              a[key] ? "bg-accent-soft text-accent-text ring-accent/40" : "text-fg-2 ring-line hover:text-fg",
            )}
          >
            {a[key] && <CheckIcon size={14} weight="bold" />}
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          a.reset();
          setPanelDocked(true);
        }}
        className="mt-1 self-start text-[13px] font-medium text-fg-2 underline-offset-2 hover:text-fg hover:underline"
      >
        {t.customize.reset}
      </button>
    </section>
  );
}

const SWATCH: Record<string, [string, string, string]> = {
  ocean: ["#07162e", "#13233e", "#243a5e"],
  midnight: ["#000000", "#121216", "#26262e"],
  graphite: ["#121315", "#212429", "#373c44"],
  plum: ["#170b22", "#2a1639", "#472a60"],
  forest: ["#08170f", "#122b1d", "#234c34"],
  sunset: ["#1d0f0c", "#361b16", "#5c3025"],
  crimson: ["#1a0a0d", "#31141b", "#56242f"],
  mocha: ["#17110d", "#2b211a", "#4a392d"],
  slate: ["#0e1218", "#1c2431", "#333f52"],
};

/** Theme cards: the dark surface colours, each shown as three bars. */
export function PalettePicker() {
  const t = useT();
  const palette = useAppearance((s) => s.palette);
  const set = useAppearance((s) => s.set);
  return (
    <div className="flex flex-col gap-2 pt-2">
      <p className="text-[13px] text-fg-2">{t.customize.palette}</p>
      <div role="radiogroup" aria-label={t.customize.palette} className="grid grid-cols-2 gap-2">
        {PALETTES.map((id) => {
          const on = palette === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ palette: id })}
              className={cn(
                "flex items-center gap-3 rounded-[14px] p-2.5 text-left ring-1 transition-colors",
                on ? "bg-surface-3 ring-accent/60" : "bg-surface-1 ring-line hover:bg-surface-2",
              )}
            >
              <span className="flex h-9 w-11 shrink-0 items-end gap-0.5 rounded-[8px] bg-black/30 p-1">
                {SWATCH[id]!.map((c) => (
                  <span key={c} className="h-full flex-1 rounded-[3px]" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.customize.palettes[id]}</span>
              {on && <CheckIcon size={15} weight="bold" className="text-accent-text" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
