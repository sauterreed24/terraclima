import { memo } from "react";
import { Layers, Search } from "lucide-react";
import { PLACE_COUNTS } from "../../data/places";
import { CLIMATE_NORMALS_PERIOD, CLIMATE_WMO_NORMALS_PERIOD } from "../../lib/atlas-metadata";
import { climateDataSnapshotLabel } from "../../lib/climate-v2/periods";

/**
 * Atlas footer — the only place in the chrome that names the editorial
 * disclaimer, climate data sources, and the corpus refresh date. memo'd
 * because the footer is fully derived from constants and never needs to
 * re-render after first mount.
 */
export const Footer = memo(function Footer() {
  return (
    <footer className="mt-10 tc-footer">
      <div className="tc-footer__inner max-w-[1600px] mx-auto px-6 py-6 text-xs text-stone flex flex-wrap gap-4 items-start justify-between">
        <div className="flex items-start gap-3 max-w-[78ch] leading-relaxed">
          <Layers className="w-3.5 h-3.5 shrink-0 mt-[0.2rem]" aria-hidden />
          <span>
            Terraclima is a hand-edited atlas of climate averages. It is not live weather, a forecast, a property appraisal or advice. Climate figures are Daymet V4 R1 averages for {CLIMATE_NORMALS_PERIOD}, with the official WMO period {CLIMATE_WMO_NORMALS_PERIOD} kept for comparison, and are checked against NOAA, ECCC and SMN weather stations. Scores are editorial ratings; each profile lists its sources and how confident the entry is.
          </span>
        </div>
        <div className="flex items-start gap-3 leading-relaxed">
          <Search className="w-3.5 h-3.5 shrink-0 mt-[0.2rem]" aria-hidden />
          <span>
            {PLACE_COUNTS.total} hand-picked places — {climateDataSnapshotLabel()}
          </span>
        </div>
      </div>
    </footer>
  );
});
