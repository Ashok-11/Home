import type { ReactNode } from "react";

/** Warm organic gradient blobs + grain — the signature backdrop for every page. */
export function BackgroundBlobs({ hero = false }: { hero?: boolean }) {
  return (
    <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="blob -left-24 -top-24 h-96 w-96"
        style={{ background: "radial-gradient(circle, #7FB08F 0%, transparent 70%)" }}
      />
      <div
        className="blob right-[-80px] top-1/3 h-[28rem] w-[28rem]"
        style={{ background: "radial-gradient(circle, #E8A47F 0%, transparent 70%)", animationDelay: "-6s" }}
      />
      <div
        className="blob bottom-[-120px] left-1/3 h-96 w-96"
        style={{ background: "radial-gradient(circle, #D9B45A 0%, transparent 70%)", animationDelay: "-11s" }}
      />
      {hero && (
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#245C3F]/10 to-transparent" />
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">
        {icon}
      </div>
      <p className="font-heading text-lg font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Little animated steam wisps for menu/food cards. */
export function Steam({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex h-4 w-5 items-end justify-center gap-[3px] ${className}`}>
      {[0, 0.6, 1.2].map((delay) => (
        <span
          key={delay}
          className="animate-steam inline-block h-3 w-[3px] rounded-full bg-current opacity-0"
          style={{ animationDelay: `-${delay}s` }}
        />
      ))}
    </span>
  );
}
