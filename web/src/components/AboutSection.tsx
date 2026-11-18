import { ArrowsClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useT } from "../i18n";
import { updateKind, useUpdate } from "../lib/update";

/** Settings > About: the version, and a button to look for a new one by hand. */
export function AboutSection() {
  const t = useT();
  const { release, phase, manual, check, install } = useUpdate();
  const kind = updateKind();
  const checking = phase === "checking";
  const busy = phase === "downloading" || phase === "installing";

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-fg-3">{t.update.about}</h3>
      <div className="flex flex-col gap-3 rounded-[16px] bg-surface-1 p-4 ring-1 ring-line">
        <div>
          <p className="font-semibold tracking-tight">Gaanly</p>
          <p className="font-mono text-[13px] text-fg-2 tabular-nums">{t.update.version(__APP_VERSION__)}</p>
        </div>

        {kind === "web" ? (
          <p className="text-sm text-fg-2">{t.update.webNote}</p>
        ) : (
          <>
            <p className="text-sm text-fg-2" aria-live="polite">
              {checking
                ? t.update.checking
                : release
                  ? t.update.available(release.version)
                  : manual === "failed"
                    ? t.update.checkFailed
                    : manual === "latest"
                      ? t.update.latest
                      : ""}
            </p>
            {release ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void install()}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <DownloadSimpleIcon size={20} weight="bold" />
                {kind === "ios" ? t.update.iosAction : t.update.action}
              </button>
            ) : (
              <button
                type="button"
                disabled={checking}
                onClick={() => void check(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface-3 px-6 font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <ArrowsClockwiseIcon size={20} weight="bold" className={checking ? "animate-spin" : undefined} />
                {t.update.check}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
