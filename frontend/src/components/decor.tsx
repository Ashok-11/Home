import type { ReactNode } from "react";
import { BRAND } from "@/lib/constants";

/** The Manshok monogram — interlocked M + A in a gold ring. Pure SVG, scales anywhere. */
export function ManshokMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Manshok">
      <defs>
        <linearGradient id="manshok-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E4B45A" />
          <stop offset="55%" stopColor="#D0663C" />
          <stop offset="100%" stopColor="#E4B45A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#14261B" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="url(#manshok-gold)" strokeWidth="1.4" opacity="0.75" />
      <path
        d="M17 43V22l8 12 7-12v21"
        fill="none"
        stroke="url(#manshok-gold)"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M33 43l7.5-21L48 43"
        fill="none"
        stroke="url(#manshok-gold)"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M36.4 36h8.2" stroke="url(#manshok-gold)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ManshokWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <ManshokMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <div className="leading-tight">
        <p className={`font-heading font-bold tracking-tight ${compact ? "text-base" : "text-lg"}`}>
          {BRAND.name}
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#9BAE9F]">{BRAND.tagline}</p>
      </div>
    </div>
  );
}

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
        style={{ background: "radial-gradient(circle, #E4B45A 0%, transparent 70%)", animationDelay: "-6s" }}
      />
      <div
        className="blob bottom-[-120px] left-1/3 h-96 w-96"
        style={{ background: "radial-gradient(circle, #D0663C 0%, transparent 70%)", animationDelay: "-11s" }}
      />
      {hero && <div className="aurora absolute -top-40 left-1/4 h-[30rem] w-[30rem] rounded-full" />}
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
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
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

/** Circular progress gauge — used for budget and personal-fund burn. */
export function RingGauge({
  value,
  size = 128,
  stroke = 11,
  label,
  sub,
  tone = "gold",
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label: string;
  sub?: string;
  tone?: "gold" | "terracotta" | "green" | "danger";
}) {
  const pct = Math.max(0, Math.min(value, 100));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const colors: Record<string, string> = {
    gold: "#E4B45A",
    terracotta: "#D0663C",
    green: "#1E4030",
    danger: "#B93826",
  };
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-gauge">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (pct / 100) * circ}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display-num text-xl font-bold leading-none">{label}</span>
        {sub && <span className="mt-1 max-w-20 text-[10px] uppercase tracking-wider text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
