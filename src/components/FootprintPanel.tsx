import { memo } from "react";
import { Globe2 } from "lucide-react";
import { PLACE_COUNTS } from "../data/places";

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-thin p-2">
      <div className="font-mono-num text-xl text-ice">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-stone">{label}</div>
    </div>
  );
}

export const FootprintPanel = memo(function FootprintPanel() {
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4" style={{ color: "#c6dcbd" }} />
        <h3 className="font-atlas text-base text-ice">The atlas in three countries</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBlock label="USA" value={PLACE_COUNTS.usa} />
        <StatBlock label="Canada" value={PLACE_COUNTS.canada} />
        <StatBlock label="Mexico" value={PLACE_COUNTS.mexico} />
      </div>
      <div className="divider-contour" />
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBlock label="Flagship" value={PLACE_COUNTS.tierA} />
        <StatBlock label="Spotlight" value={PLACE_COUNTS.tierB} />
        <StatBlock label="Index" value={PLACE_COUNTS.tierC} />
      </div>
      <p className="text-xs text-stone leading-relaxed">
        Flagship stops are written like chapters — rich story, risks, and climate-change context. Spotlight stops are built to compare cleanly. Index entries keep the list honest as we add more towns without bloating the map.
      </p>
      <p className="text-[10px] text-stone/90 leading-relaxed border-t border-[rgba(200,160,120,0.2)] pt-2 mt-2">
        Open any profile: cards, map, and the detail drawer rank that stop against the full {PLACE_COUNTS.total}-place corpus (wetter/drier, cooler summers, higher ground, diurnal, scores) using the same summary fields as the header numbers.
      </p>
    </div>
  );
});
