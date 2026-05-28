import { memo } from "react";
import { Layers, Search } from "lucide-react";
import { PLACE_COUNTS } from "../../data/places";
import { ATLAS_EDITORIAL_SNAPSHOT, CLIMATE_NORMALS_PERIOD } from "../../lib/atlas-metadata";

/**
 * Atlas footer — the only place in the chrome that names the editorial
 * disclaimer, climate data sources, and the corpus refresh date. memo'd
 * because the footer is fully derived from constants and never needs to
 * re-render after first mount.
 */
export const Footer = memo(function Footer() {
  return (
    <footer className="mt-10 tc-footer">
      <div className="max-w-[1600px] mx-auto px-6 py-6 text-xs text-stone flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-3.5 h-3.5" />
          <span>
            Terraclima is a curated atlas, not a live weather, appraisal, or parcel feed. Climate numbers lean on NOAA, PRISM, ECCC, and SMN normals ({CLIMATE_NORMALS_PERIOD} where available), with WorldClim as a wider net. Geospatial screening uses consistent terrain-climate logic, Sentinel-2 and Landsat reference families, and a relief-texture proxy; every score points back to place notes, sources, and confidence.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-3.5 h-3.5" />
          <span>
            {PLACE_COUNTS.total} hand-picked places - editorial refresh {ATLAS_EDITORIAL_SNAPSHOT}
          </span>
        </div>
      </div>
    </footer>
  );
});
