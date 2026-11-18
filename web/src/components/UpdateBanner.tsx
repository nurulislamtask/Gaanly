import { DownloadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useT } from "../i18n";
import { updateKind, useUpdate } from "../lib/update";

/** "Gaanly 1.0.1 is ready": the one place the app asks to be updated. Settings > About has the same button. */
export function UpdateBanner() {
  const t = useT();
  const { release, phase, progress, dismissed, install, dismiss } = useUpdate();
  const kind = updateKind();
  const busy = phase === "downloading" || phase === "installing";
  const show = !!release && kind !== "web" && (busy || dismissed !== release.version);

  return (
    <AnimatePresence>
      {show && release && (
        <motion.aside
          key="update"
          role="status"
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="glass fixed top-[calc(12px+env(safe-area-inset-top))] right-3 left-3 z-[70] mx-auto flex max-w-sm flex-col gap-3 rounded-[20px] p-4 md:top-12 md:right-4 md:left-auto md:mx-0"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
              <DownloadSimpleIcon size={20} weight="bold" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold tracking-tight">{t.update.ready(release.version)}</p>
              <p className="text-[13px] text-fg-2">
                {phase === "installing"
                  ? t.update.installing
                  : phase === "downloading"
                    ? t.update.downloading(progress)
                    : kind === "ios"
                      ? t.update.iosBody
                      : t.update.readyBody}
              </p>
            </div>
            {!busy && (
              <button
                type="button"
                onClick={dismiss}
                aria-label={t.update.later}
                className="grid size-8 shrink-0 place-items-center rounded-full text-fg-2 transition-colors hover:bg-highlight hover:text-fg"
              >
                <XIcon size={16} />
              </button>
            )}
          </div>

          {busy ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-4" aria-hidden="true">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${phase === "installing" ? 100 : progress}%` }}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void install()}
                className="h-10 flex-1 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink transition-transform active:scale-[0.98]"
              >
                {kind === "ios" ? t.update.iosAction : t.update.action}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="h-10 rounded-full px-4 text-sm font-medium text-fg-2 transition-colors hover:bg-highlight hover:text-fg"
              >
                {t.update.later}
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
