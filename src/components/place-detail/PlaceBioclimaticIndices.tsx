import { memo, useMemo } from "react";
import { Layers } from "lucide-react";
import type { Place } from "../../types";
import { computeBioclim, type BioclimIndex, type BioclimResult } from "../../lib/bioclim";
import { getPlaceBioclimRanks, type PlaceBioclimRanks } from "../../lib/atlas-corpus-stats";
import { useProse } from "../../lib/units";

const ICON_COLOR = "#9bd9c2";

function fmtPercentile(share: number | null): string | null {
  if (share == null) return null;
  const pct = Math.round(share * 100);
  return `higher than ${pct}% of the corpus`;
}

function valueWithClass(idx: BioclimIndex, format: (v: number) => string): { primary: string; secondary: string } {
  if (idx.value === null) {
    return { primary: "—", secondary: nullReasonLabel(idx.reason) };
  }
  return { primary: format(idx.value), secondary: idx.classLabel };
}

function nullReasonLabel(reason: "mat_below_neg10" | "no_growing_season" | "no_pet"): string {
  if (reason === "mat_below_neg10") return "Undefined (MAT ≤ −10 °C)";
  if (reason === "no_growing_season") return "No growing season (no month > 10 °C)";
  return "Undefined (every month below freezing)";
}

interface CardConfig {
  label: string;
  full: string;
  citation: string;
  format: (v: number) => string;
  read: (b: BioclimResult) => { idx: BioclimIndex | { value: number; class: string; classLabel: string }; share: number | null };
  description: (b: BioclimResult) => string;
}

function deMartonneRead(b: BioclimResult): string {
  if (b.deMartonne.value === null) return "Mean annual temperature is at or below −10 °C, so the De Martonne ratio is not defined.";
  const value = b.deMartonne.value;
  const cls = b.deMartonne.class;
  if (cls === "hyperarid") return "Annual precipitation is a tiny fraction of warmth — desert-end of the spectrum.";
  if (cls === "arid") return "Sparse rain against warm temperatures: irrigation-dependent agriculture.";
  if (cls === "semi-arid") return "Steppe / rain-shadow signature; rain barely keeps pace with warmth.";
  if (cls === "mediterranean") return "Le Houérou's Mediterranean band — wet enough for forest where summer rain isn't required.";
  if (cls === "sub-humid") return "Rain moderately exceeds warmth — temperate woodland regime.";
  if (cls === "humid") return "Comfortable annual moisture surplus relative to warmth.";
  if (cls === "very-humid") return "Cool wet regime: temperate rainforest or boreal humid.";
  return `Cool or very wet: De Martonne reaches ${value.toFixed(1)} — the index loses discriminating power above ~55.`;
}

function conradRead(b: BioclimResult): string {
  const value = b.conrad.value as number;
  const cls = (b.conrad as { class: string }).class;
  if (cls === "extreme-oceanic") return "Annual temperature swing is tiny — pure maritime regime, often tropical.";
  if (cls === "oceanic") return "Coast-modulated swing; mild winters and cool summers vs interior.";
  if (cls === "sub-continental") return "Interior modulation: noticeable winter cold or summer heat.";
  if (cls === "continental") return "Wide annual temperature swing — strongly continental interior.";
  return `Verkhoyansk-grade continentality (K ≈ ${value.toFixed(0)}): extreme winter / summer divergence.`;
}

function petRead(b: BioclimResult): string {
  const pet = b.thornthwaitePet.value;
  if (pet === 0) return "Every month is below freezing — Thornthwaite reports no evaporative demand.";
  if (pet < 500) return "Low atmospheric water demand: cool or short growing season.";
  if (pet < 1000) return "Moderate evaporative demand — temperate to cool-summer regime.";
  if (pet < 1500) return "Substantial water demand — warm-summer / subtropical.";
  return "Very high evaporative demand — hot, sunny, water-stressed regime.";
}

function selianinovRead(b: BioclimResult): string {
  if (b.selianinov.value === null) return "No month's mean temperature exceeds 10 °C, so the growing-season ratio is not defined.";
  const cls = b.selianinov.class;
  if (cls === "dry") return "Growing-season precipitation is far below thermal demand — irrigation essential.";
  if (cls === "arid") return "Sparse growing-season rain; dryland agriculture is marginal.";
  if (cls === "semi-arid") return "Growing-season moisture is partial — supplemental water often needed.";
  if (cls === "sufficient") return "Growing-season precipitation roughly matches thermal demand.";
  if (cls === "humid") return "Reliable growing-season moisture — green-summer regime.";
  if (cls === "wet") return "Abundant growing-season rain — wet temperate / lush regime.";
  return "Monsoon-grade growing-season rainfall — tropical wet climate.";
}

function unepRead(b: BioclimResult): string {
  if (b.unepAridity.value === null) return "Thornthwaite PET is zero (frozen year), so the UNEP ratio is not defined.";
  const cls = b.unepAridity.class;
  if (cls === "hyperarid") return "True desert by the UNEP classification (P / PET < 0.05).";
  if (cls === "arid") return "Annual precipitation covers a small fraction of PET.";
  if (cls === "semi-arid") return "Steppe-to-savanna regime; precipitation covers 20–50% of PET.";
  if (cls === "dry-sub-humid") return "Transitional band — precipitation covers ~half to two-thirds of PET.";
  return "Humid annual balance: precipitation comfortably exceeds 65% of PET.";
}

function buildCards(bio: BioclimResult, ranks: PlaceBioclimRanks): CardConfig[] {
  return [
    {
      label: "De Martonne",
      full: "De Martonne aridity index",
      citation: "De Martonne 1926",
      format: v => v.toFixed(1),
      read: () => ({ idx: bio.deMartonne, share: ranks.deMartonneAboveShare }),
      description: () => deMartonneRead(bio),
    },
    {
      label: "Conrad",
      full: "Conrad continentality",
      citation: "Conrad 1946",
      format: v => v.toFixed(1),
      read: () => ({ idx: bio.conrad, share: ranks.conradAboveShare }),
      description: () => conradRead(bio),
    },
    {
      label: "Thornthwaite PET",
      full: "Annual potential evapotranspiration",
      citation: "Thornthwaite 1948",
      format: v => `${Math.round(v)} mm`,
      read: () => ({ idx: { value: bio.thornthwaitePet.value, class: "", classLabel: petBand(bio.thornthwaitePet.value) }, share: ranks.thornthwaitePetAboveShare }),
      description: () => petRead(bio),
    },
    {
      label: "Selianinov HTC",
      full: "Growing-season hydrothermal coefficient",
      citation: "Selianinov 1928",
      format: v => v.toFixed(2),
      read: () => ({ idx: bio.selianinov, share: ranks.selianinovAboveShare }),
      description: () => selianinovRead(bio),
    },
    {
      label: "UNEP aridity",
      full: "Annual precipitation ÷ PET",
      citation: "UNEP 1992",
      format: v => v.toFixed(2),
      read: () => ({ idx: bio.unepAridity, share: ranks.unepAridityAboveShare }),
      description: () => unepRead(bio),
    },
  ];
}

function petBand(pet: number): string {
  if (pet === 0) return "None (frozen year)";
  if (pet < 500) return "Low demand";
  if (pet < 1000) return "Moderate demand";
  if (pet < 1500) return "High demand";
  return "Very high demand";
}

export const PlaceBioclimaticIndices = memo(function PlaceBioclimaticIndices({ place, anchorId, intro }: { place: Place; anchorId: string; intro?: string }) {
  const prose = useProse();
  const bio = useMemo(() => computeBioclim(place), [place]);
  const ranks = useMemo(() => getPlaceBioclimRanks(place), [place]);
  if (!bio) return null;
  const cards = buildCards(bio, ranks);

  return (
    <section id={anchorId} className="detail-doc-section anim-fade-in scroll-mt-28">
      <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
        <Layers className="w-4 h-4 shrink-0" style={{ color: ICON_COLOR }} aria-hidden />
        Bioclimatic indices
      </h3>
      <p className="text-sm text-stone mb-3 max-w-2xl">
        {intro ? prose(intro) : "Five standard climate-science indices computed directly from this place's monthly temperature and precipitation normals — independent of the authored Köppen label, citable to original sources, comparable across the atlas."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {cards.map(card => {
          const { idx, share } = card.read(bio);
          const display = valueWithClass(idx as BioclimIndex, card.format);
          const percentile = fmtPercentile(share);
          return (
            <div key={card.label} className="panel-thin p-3 flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-wider text-stone" title={card.full}>{card.label}</div>
              <div className="font-mono-num text-2xl text-ice leading-tight">{display.primary}</div>
              <div className="text-xs text-frost">{display.secondary}</div>
              {percentile ? <div className="text-[11px] text-stone">{percentile}</div> : null}
              <div className="text-[11px] text-stone leading-snug mt-1">{card.description(bio)}</div>
              <div className="text-[10px] text-stone/70 mt-auto pt-1 font-mono-num">{card.citation}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
