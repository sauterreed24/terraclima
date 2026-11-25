import { memo, useMemo } from "react";
import { Layers } from "lucide-react";
import type { Place } from "../../types";
import { computeBioclim, CONRAD_GLOSS, DE_MARTONNE_GLOSS, type BioclimIndex, type BioclimResult } from "../../lib/bioclim";
import { getPlaceBioclimRanks, type PlaceBioclimRanks } from "../../lib/atlas-corpus-stats";
import { classifyDossierSection } from "../../lib/evidence-summary";
import { EvidenceClassLabel } from "./PlaceEvidenceSummary";
import { useProse } from "../../lib/units";

const ICON_COLOR = "#9bd9c2";

function fmtPercentile(share: number | null): string | null {
  if (share == null) return null;
  const pct = Math.round(share * 100);
  return `higher than ${pct}% of atlas places`;
}

function valueWithClass(idx: BioclimIndex, format: (v: number) => string): { primary: string; secondary: string } {
  if (idx.value === null) {
    return { primary: "—", secondary: nullReasonLabel(idx.reason) };
  }
  return { primary: format(idx.value), secondary: idx.classLabel };
}

function nullReasonLabel(reason: "mat_below_neg10" | "no_growing_season" | "no_pet"): string {
  if (reason === "mat_below_neg10") return "Not defined (mean annual temperature ≤ −10 °C)";
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
  if (cls === "hyperarid") return "Very little rain or snow for how warm it is: a true desert.";
  if (cls === "arid") return "Little rain for how warm it is: crops need irrigation.";
  if (cls === "semi-arid") return "Typical of dry grassland and rain shadows: rain barely keeps pace with warmth.";
  if (cls === "mediterranean") return "Enough rain and snow for woodland, though dry seasons still show. The published name for this band is “Mediterranean”; it describes the yearly total, not when the rain falls.";
  if (cls === "sub-humid") return "Rain and snow moderately exceed what the warmth uses: woodland country.";
  if (cls === "humid") return "More rain and snow through the year than the warmth uses.";
  if (cls === "very-humid") return "Cool and wet: temperate rainforest or northern forest.";
  return `Cool or very wet: the index reaches ${value.toFixed(1)}. Above about 55 it no longer separates places well.`;
}

function conradRead(b: BioclimResult): string {
  const value = b.conrad.value as number;
  const cls = (b.conrad as { class: string }).class;
  if (cls === "extreme-oceanic") return "Temperature barely changes through the year: an ocean-governed climate, often tropical.";
  if (cls === "oceanic") return "A small swing between winter and summer, as on coasts and in tropical highlands. The published name for this band is “oceanic”, whether or not the sea is near.";
  if (cls === "sub-continental") return "A moderate swing: noticeable winter cold or summer heat.";
  if (cls === "continental") return "A wide swing between winter and summer, typical of land far from the sea.";
  return `An extreme swing between winter and summer (index about ${value.toFixed(0)}), among the largest on Earth.`;
}

function petRead(b: BioclimResult): string {
  const pet = b.thornthwaitePet.value;
  if (pet === 0) return "Every month is below freezing, so the method reports no evaporative demand.";
  if (pet < 500) return "The air takes up little water: a cool or short growing season.";
  if (pet < 1000) return "Moderate evaporative demand, typical of temperate and cool-summer climates.";
  if (pet < 1500) return "High water demand, typical of warm-summer and subtropical climates.";
  return "Very high evaporative demand: hot, sunny and short of water.";
}

function selianinovRead(b: BioclimResult): string {
  if (b.selianinov.value === null) return "No month's mean temperature exceeds 10 °C, so the growing-season ratio is not defined.";
  const cls = b.selianinov.class;
  if (cls === "dry") return "Growing-season rain is far below what the warmth uses: irrigation is essential.";
  if (cls === "arid") return "Sparse growing-season rain; farming without irrigation is marginal.";
  if (cls === "semi-arid") return "Growing-season rain covers part of the need; extra water is often required.";
  if (cls === "sufficient") return "Growing-season rain roughly matches what the warmth uses.";
  if (cls === "humid") return "Reliable growing-season rain: summers stay green.";
  if (cls === "wet") return "Abundant growing-season rain: lush, wet summers.";
  return "Very heavy growing-season rain, as in monsoon and wet tropical climates.";
}

function unepRead(b: BioclimResult): string {
  if (b.unepAridity.value === null) return "Evaporative demand is zero (every month is frozen), so the ratio is not defined.";
  const cls = b.unepAridity.class;
  if (cls === "hyperarid") return "True desert: precipitation is under 5% of evaporative demand.";
  if (cls === "arid") return "Precipitation covers a small part of evaporative demand.";
  if (cls === "semi-arid") return "Dry grassland country: precipitation covers 20–50% of evaporative demand.";
  if (cls === "dry-sub-humid") return "In between: precipitation covers about half to two-thirds of evaporative demand.";
  return "Precipitation covers more than 65% of evaporative demand.";
}

function buildCards(bio: BioclimResult, ranks: PlaceBioclimRanks): CardConfig[] {
  return [
    {
      label: "Moisture (De Martonne aridity index)",
      full: `De Martonne aridity index. ${DE_MARTONNE_GLOSS}`,
      citation: "De Martonne 1926",
      format: v => v.toFixed(1),
      read: () => ({ idx: bio.deMartonne, share: ranks.deMartonneAboveShare }),
      description: () => deMartonneRead(bio),
    },
    {
      label: "Seasonal swing (Conrad continentality index)",
      full: `Conrad continentality index. ${CONRAD_GLOSS}`,
      citation: "Conrad 1946",
      format: v => v.toFixed(1),
      read: () => ({ idx: bio.conrad, share: ranks.conradAboveShare }),
      description: () => conradRead(bio),
    },
    {
      label: "Evaporative demand (PET)",
      full: "Annual potential evapotranspiration",
      citation: "Thornthwaite 1948",
      format: v => `${Math.round(v)} mm`,
      read: () => ({ idx: { value: bio.thornthwaitePet.value, class: "", classLabel: petBand(bio.thornthwaitePet.value) }, share: ranks.thornthwaitePetAboveShare }),
      description: () => petRead(bio),
    },
    {
      label: "Growing-season moisture (Selianinov coefficient)",
      full: "Selianinov hydrothermal coefficient: rain in the growing season compared with its warmth; higher is wetter.",
      citation: "Selianinov 1928",
      format: v => v.toFixed(2),
      read: () => ({ idx: bio.selianinov, share: ranks.selianinovAboveShare }),
      description: () => selianinovRead(bio),
    },
    {
      label: "Rain vs evaporation (UNEP aridity index)",
      full: "Annual precipitation ÷ potential evapotranspiration (PET)",
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

export const PlaceBioclimaticIndices = memo(function PlaceBioclimaticIndices({ place, anchorId }: { place: Place; anchorId: string }) {
  const prose = useProse();
  const bio = useMemo(() => computeBioclim(place), [place]);
  const ranks = useMemo(() => getPlaceBioclimRanks(place), [place]);
  if (!bio) return null;
  const cards = buildCards(bio, ranks);
  const cardReads = cards.map(card => ({ card, ...card.read(bio) }));
  const undefinedReads = cardReads.filter(({ idx }) => idx.value === null);

  return (
    <details id={anchorId} className="place-score-details detail-doc-section anim-fade-in scroll-mt-28">
      <summary className="place-score-details__summary">
        <Layers className="w-4 h-4 shrink-0" style={{ color: ICON_COLOR }} aria-hidden />
        <h3 className="place-score-details__title">Bioclimatic indices</h3>
      </summary>
      <div className="place-score-details__body">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <EvidenceClassLabel cls={classifyDossierSection("bioclim")} />
      </div>
      <p className="text-sm text-stone mb-3 max-w-2xl">
        Five standard indices from climate science that measure how dry a place is and how far its seasons swing. Each is computed from this place's monthly temperature and precipitation averages, so the figures compare directly across the atlas.
      </p>
      {undefinedReads.length > 0 ? (
        <div className="tc-accent-panel px-3 py-2.5 mb-3 text-[12px] leading-snug text-stone-readable">
          <div className="text-[10px] uppercase tracking-wider text-glacier-700 mb-1">Not defined here</div>
          <p>
            {undefinedReads.map(({ card }) => card.label).join(", ")} cannot be calculated here because no month is warm enough to count as a growing season. The other indices still apply.
          </p>
        </div>
      ) : null}
      {/* Container-aware (dossier column, not viewport): the drawer caps at
          900px and the reading nav eats ~220px, so viewport breakpoints made
          these five cards squeeze into ~116px columns on desktop. */}
      <div className="grid grid-cols-1 @xl/dossier:grid-cols-2 @3xl/dossier:grid-cols-3 gap-2.5">
        {cardReads.map(({ card, idx, share }) => {
          const display = valueWithClass(idx as BioclimIndex, card.format);
          const percentile = fmtPercentile(share);
          return (
            <div key={card.label} className="panel-thin p-3 flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-wider text-stone" title={card.full}>{card.label}</div>
              <div className="font-mono-num text-2xl text-ice leading-tight">{prose(display.primary)}</div>
              <div className="text-xs text-frost">{prose(display.secondary)}</div>
              {percentile ? <div className="text-[11px] text-stone">{percentile}</div> : null}
              <div className="text-[11px] text-stone leading-snug mt-1">{prose(card.description(bio))}</div>
              <div className="text-[10px] text-stone mt-auto pt-1 font-mono-num">{card.citation}</div>
            </div>
          );
        })}
      </div>
      </div>
    </details>
  );
});
