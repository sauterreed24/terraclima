import { memo, useCallback, useId, useMemo, useState } from "react";
import { ArrowRight, Briefcase, Check, Copy, Mail, ShieldCheck } from "lucide-react";
import type { Place } from "../types";
import type { FilterState, RankingResult } from "../lib/scoring";
import { buildCommercialLead } from "../lib/commercial";

type CommercialBriefPanelVariant = "dock" | "compact" | "wide";

interface Props {
  ranked: readonly RankingResult[];
  comparePlaces: readonly Place[];
  filters: FilterState;
  rankingLabel: string;
  variant?: CommercialBriefPanelVariant;
  onOpenPro?: () => void;
  showProLink?: boolean;
}

export const CommercialBriefPanel = memo(function CommercialBriefPanel({
  ranked,
  comparePlaces,
  filters,
  rankingLabel,
  variant = "dock",
  onOpenPro,
  showProLink = true,
}: Props) {
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const lead = useMemo(() => buildCommercialLead({
    ranked,
    comparePlaces,
    filters,
    rankingLabel,
    appUrl: typeof window === "undefined" ? undefined : window.location.href,
  }), [ranked, comparePlaces, filters, rankingLabel]);
  const shortlist = lead.shortlist.slice(0, variant === "wide" ? 4 : 3);

  const copyBrief = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(lead.body).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => setCopied(false));
  }, [lead.body]);

  return (
    <section
      className={`tc-commercial-panel panel p-3 ${variant === "wide" ? "tc-commercial-panel--wide" : ""}`}
      aria-labelledby={titleId}
    >
      <div className="flex items-start gap-2.5">
        <div className="tc-commercial-panel__icon" aria-hidden>
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-glacier-700">Paid brief</div>
          <h2 id={titleId} className="font-atlas text-lg text-ice leading-tight">
            Sell the shortlist, not the ranking
          </h2>
          <p className="text-xs text-frost leading-relaxed mt-1">
            Convert the current filters into a paid climate-fit brief with the selected URL, top matches, and caveats already attached.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[rgba(26,143,168,0.22)] bg-[rgba(232,248,251,0.44)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-stone-readable">Starter offer</span>
          <span className="font-mono-num text-sm text-ice">{lead.offer.price}</span>
        </div>
        <div className="text-sm text-frost leading-snug mt-1">{lead.offer.name}</div>
        <div className="text-[11px] text-stone-readable leading-snug mt-1">{lead.offer.promise}</div>
      </div>

      {shortlist.length > 0 ? (
        <ol className="mt-3 space-y-1.5" aria-label="Brief shortlist preview">
          {shortlist.map((place, index) => (
            <li key={place.id} className="tc-commercial-panel__place">
              <span className="font-mono-num text-[11px] text-glacier-700">{index + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm text-ice truncate">{place.name}</span>
                <span className="block text-[11px] text-stone-readable truncate">{place.region}, {place.country}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs text-stone-readable leading-relaxed">
          Pick filters or save compare places and the paid brief request will carry that shortlist forward.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <a href={lead.mailtoHref} className="btn-primary justify-center !text-xs">
          <Mail className="w-3.5 h-3.5" aria-hidden />
          {lead.offer.cta}
        </a>
        <div className={showProLink ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
          <button type="button" onClick={copyBrief} className="btn-ghost justify-center !text-xs !px-2">
            {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
          {showProLink && onOpenPro ? (
            <button type="button" onClick={onOpenPro} className="btn-ghost justify-center !text-xs !px-2">
              Pro
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          ) : showProLink ? (
            <a href="?v=pro" className="btn-ghost justify-center !text-xs !px-2">
              Pro
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      {variant !== "compact" ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[rgba(61,143,85,0.22)] bg-[rgba(236,248,232,0.55)] px-2.5 py-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sage-700 shrink-0 mt-0.5" aria-hidden />
          <p className="text-[11px] text-stone-readable leading-relaxed">
            Paid briefs and future sponsors never alter rankings, citations, confidence notes, or risk warnings.
          </p>
        </div>
      ) : null}
    </section>
  );
});
