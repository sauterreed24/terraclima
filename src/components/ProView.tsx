import { memo, useMemo, type ReactNode } from "react";
import { ArrowRight, Briefcase, CheckCircle2, Database, DollarSign, FileText, Mail, ShieldCheck, Users } from "lucide-react";
import { CommercialBriefPanel } from "./CommercialBriefPanel";
import type { Place } from "../types";
import type { FilterState, RankingResult } from "../lib/scoring";
import { buildCommercialLead, COMMERCIAL_OFFERS, type CommercialOfferId } from "../lib/commercial";

interface Props {
  ranked: readonly RankingResult[];
  comparePlaces: readonly Place[];
  filters: FilterState;
  rankingLabel: string;
  onOpenPlace: (id: string) => void;
  onOpenExplorer: () => void;
}

const OFFER_ICON: Record<CommercialOfferId, ReactNode> = {
  "personal-brief": <FileText className="w-4 h-4" aria-hidden />,
  "relocation-deep-brief": <Briefcase className="w-4 h-4" aria-hidden />,
  "advisor-pack": <Users className="w-4 h-4" aria-hidden />,
  "data-license": <Database className="w-4 h-4" aria-hidden />,
};

export const ProView = memo(function ProView({
  ranked,
  comparePlaces,
  filters,
  rankingLabel,
  onOpenPlace,
  onOpenExplorer,
}: Props) {
  const appUrl = typeof window === "undefined" ? undefined : window.location.href;
  const heroLead = useMemo(() => buildCommercialLead({
    ranked,
    comparePlaces,
    filters,
    rankingLabel,
    appUrl,
    offerId: "relocation-deep-brief",
  }), [ranked, comparePlaces, filters, rankingLabel, appUrl]);
  const offerLeads = useMemo(() => COMMERCIAL_OFFERS.map(offer => ({
    offer,
    lead: buildCommercialLead({
      ranked,
      comparePlaces,
      filters,
      rankingLabel,
      appUrl,
      offerId: offer.id,
    }),
  })), [ranked, comparePlaces, filters, rankingLabel, appUrl]);
  const shortlist = heroLead.shortlist.slice(0, 5);

  return (
    <div className="tc-pro-view space-y-5">
      <section className="tc-pro-hero p-1 sm:p-2">
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,143,168,0.28)] bg-[rgba(232,248,251,0.72)] px-3 py-1 text-[10px] uppercase tracking-wider text-glacier-700">
              <DollarSign className="w-3.5 h-3.5" aria-hidden />
              Profit path
            </div>
            <h1 className="font-atlas text-3xl sm:text-4xl text-ice text-depth-hero leading-tight mt-3">
              Paid climate intelligence built on the live atlas
            </h1>
            <p className="text-sm sm:text-base text-frost leading-relaxed mt-2 max-w-3xl">
              Terraclima can sell the part users already need after discovery: a short, credible climate-fit brief that preserves the public atlas, cites the shortlist, and keeps rankings independent from revenue.
            </p>
            <div className="mt-4 grid sm:grid-cols-3 gap-2">
              <ProSignal label="Fastest conversion" value="$29" note="starter brief" />
              <ProSignal label="Best margin" value="$149" note="deep relocation brief" />
              <ProSignal label="B2B upside" value="$499+" note="advisor and data licenses" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={heroLead.mailtoHref} className="btn-primary">
                <Mail className="w-4 h-4" aria-hidden />
                Start a paid brief
              </a>
              <button type="button" onClick={onOpenExplorer} className="btn-ghost">
                Tune shortlist
                <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
          <CommercialBriefPanel
            ranked={ranked}
            comparePlaces={comparePlaces}
            filters={filters}
            rankingLabel={rankingLabel}
            variant="compact"
            showProLink={false}
          />
        </div>
      </section>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <div className="tc-page-intro">
            <div className="text-xs uppercase tracking-wider text-stone">Offers</div>
            <h2 className="font-atlas text-2xl text-ice text-depth-hero mt-0.5">Monetization menu</h2>
            <p className="text-sm text-frost mt-1 max-w-2xl">
              Each offer is anchored to a real user job: shortlist a move, compare a household profile, support advisors, or license the structured corpus.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {offerLeads.map(({ offer, lead }) => (
              <article key={offer.id} className="tc-offer-card panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="tc-offer-card__icon" aria-hidden>{OFFER_ICON[offer.id]}</div>
                    <div className="min-w-0">
                      <h3 className="font-atlas text-lg text-ice leading-tight">{offer.name}</h3>
                      <p className="text-[11px] uppercase tracking-wider text-stone-readable mt-1">{offer.audience}</p>
                    </div>
                  </div>
                  <div className="font-mono-num text-sm text-ice shrink-0">{offer.price}</div>
                </div>
                <p className="text-sm text-frost leading-relaxed mt-3">{offer.promise}</p>
                <ul className="mt-3 space-y-1.5 text-xs text-stone-readable">
                  {offer.deliverables.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sage-700 mt-0.5" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <a href={lead.mailtoHref} className="btn-ghost justify-center w-full mt-4">
                  <Mail className="w-3.5 h-3.5" aria-hidden />
                  {offer.cta}
                </a>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel p-4 space-y-4" aria-label="Current paid brief shortlist">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-glacier-700">Current shortlist</div>
            <h2 className="font-atlas text-lg text-ice mt-0.5">What the buyer gets first</h2>
            <p className="text-xs text-frost leading-relaxed mt-1">
              Saved compare places lead. If none are saved, Terraclima uses the top live-ranked matches.
            </p>
          </div>
          {shortlist.length > 0 ? (
            <ol className="space-y-2">
              {shortlist.map((place, index) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => onOpenPlace(place.id)}
                    className="tc-pro-shortlist-row"
                    aria-label={`Open ${place.name} from paid brief shortlist`}
                  >
                    <span className="font-mono-num text-glacier-700">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ice truncate">{place.name}</span>
                      <span className="block text-[11px] text-stone-readable truncate">{place.region}, {place.country} - {place.koppen}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone shrink-0" aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-stone-readable leading-relaxed">
              Open Explorer and pick filters to generate a buyer-ready shortlist.
            </p>
          )}
          <div className="rounded-lg border border-[rgba(61,143,85,0.24)] bg-[rgba(236,248,232,0.52)] p-3">
            <div className="flex items-center gap-2 text-sage-700 text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              Trust guardrail
            </div>
            <p className="text-xs text-stone-readable leading-relaxed mt-1">
              Revenue is attached to synthesis and service. Paid placement must stay separate from rank order, source quality, and risk language.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
});

function ProSignal({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-[rgba(26,143,168,0.18)] bg-[rgba(255,253,248,0.72)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-stone-readable">{label}</div>
      <div className="font-mono-num text-xl text-ice leading-tight mt-0.5">{value}</div>
      <div className="text-[11px] text-frost leading-snug">{note}</div>
    </div>
  );
}
