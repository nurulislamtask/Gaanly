import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useT } from "../i18n";
import { cn } from "../lib/format";
import { paths } from "../lib/routes";
import { LogoMark } from "./Brand";
import { IconButton } from "./IconButton";

/** Sticky page header. On phones it carries the brand mark and the settings entry, since there is no rail. */
export function PageHeader({
  title,
  actions,
  mobileOnly,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  /** Pages with their own large hero title only need the compact bar on phones. */
  mobileOnly?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const t = useT();
  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-10 bg-linear-to-b from-bg via-bg/90 to-bg/0 md:bg-surface-1/80 md:bg-none md:backdrop-blur-xl",
        // Without a title or actions the header only exists for the phone brand bar.
        ((!title && !actions) || mobileOnly) && "md:hidden",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-3 px-4 md:h-16 md:px-6">
        <LogoMark className="size-7 shrink-0 text-accent-text md:hidden" />
        {!title && <span className="text-lg font-semibold tracking-tight md:hidden">gaanly</span>}
        {title && <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight md:text-xl">{title}</h1>}
        {!title && <span className="flex-1" />}
        {actions}
        <IconButton
          label={t.nav.search}
          onClick={() => navigate(paths.search)}
          className="-mr-2 md:hidden"
        >
          <MagnifyingGlassIcon size={22} />
        </IconButton>
      </div>
    </header>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end justify-between gap-4 px-4 md:px-6">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Back in history when there is somewhere to go back to (in the app), else to `fallback`. */
export function BackButton({ fallback, label }: { fallback: string; label?: string }) {
  const navigate = useNavigate();
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate(fallback))}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-fg-2 hover:bg-surface-3 hover:text-fg"
    >
      <ArrowLeftIcon size={16} /> {label ?? t.common.back}
    </button>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-[18px] bg-surface-3 text-fg-2">{icon}</span>
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="max-w-[40ch] text-sm text-fg-2">{body}</p>
      {action}
    </div>
  );
}
