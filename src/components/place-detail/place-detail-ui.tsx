/**
 * Shared low-level UI primitives used across the place-detail dossier
 * sections. Extracted from PlaceDetail.tsx during the dossier refactor so
 * per-section files (PlaceResidencyBrief, PlaceComfortPrecision, etc.) can
 * import the same `Section` / `KeyValue` / `LabelRow` / `Legend` /
 * `ScorePill` building blocks instead of redefining them or threading
 * markup-shape decisions through every section.
 */
import type { ReactNode } from "react";

export function Section({
  anchorId,
  title,
  icon,
  children,
}: {
  anchorId?: string;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={anchorId} className="detail-doc-section anim-fade-in">
      {title && (
        <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
          {icon}{title}
        </h3>
      )}
      {children}
    </section>
  );
}

/**
 * Act divider used to separate the dossier into readable zones — e.g. the
 * humanistic "lived read" from the measurement-heavy "data lab" and the
 * land/agriculture sections. Keeps the long dossier legible without forcing a
 * structural reorder of every section.
 */
export function ScoreDetails({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details id={id} className="place-score-details detail-doc-section anim-fade-in scroll-mt-28">
      <summary className="place-score-details__summary">
        {icon}
        {title}
      </summary>
      <div className="place-score-details__body">{children}</div>
    </details>
  );
}

export function ZoneDivider({
  eyebrow,
  title,
  blurb,
  icon,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="detail-zone-divider" role="separator" aria-label={title}>
      <div className="detail-zone-divider__rule" aria-hidden />
      <div className="detail-zone-divider__body">
        <span className="detail-zone-divider__eyebrow">{icon}{eyebrow}</span>
        <div className="detail-zone-divider__title">{title}</div>
        {blurb ? <p className="detail-zone-divider__blurb">{blurb}</p> : null}
      </div>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm border-b last:border-0 border-[rgba(200,160,120,0.28)]">
      <span className="text-stone">{label}</span>
      <span className="text-frost text-right font-mono-num">{value}</span>
    </div>
  );
}

export function LabelRow({ label }: { label: string }) {
  return <div className="text-[10px] uppercase tracking-wider text-stone mb-1">{label}</div>;
}

export function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-stone">{text}</span>
    </span>
  );
}

export function ScorePill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "glacier" | "sage" | "ochre" | "ember";
}) {
  const c: Record<string, string> = { glacier: "#8cc8e0", sage: "#c6dcbd", ochre: "#f0d29c", ember: "#d37c5b" };
  return (
    <div className="panel-thin p-3">
      <div className="text-[10px] uppercase tracking-wider text-stone">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono-num text-xl" style={{ color: c[tone] }}>{value}</span>
        <span className="text-xs text-stone">/ 100</span>
      </div>
      <div
        className="h-1 rounded-full bg-[rgba(71,90,122,0.4)] mt-2 overflow-hidden"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value} out of 100`}
      >
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: c[tone] }} />
      </div>
    </div>
  );
}

/** Capitalize the first character. Local helper for inline category labels. */
export function titleCaseLocal(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}
