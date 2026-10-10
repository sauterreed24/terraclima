import type { Place, RiskAssessment } from "../../types";
import { RISK_VALUE } from "../../lib/scoring";
import { useProse } from "../../lib/units";

const LABEL: Record<string, string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storm",
  landslide: "Landslide",
  coastal: "Coastal / SLR",
};

interface Props { place: Place }

export function RiskProfile({ place }: Props) {
  const prose = useProse();
  const rows: [string, RiskAssessment][] = Object.entries(place.risks);
  return (
    <div className="flex flex-col gap-1.5" role="list" aria-label={`Climate risk profile for ${place.name}`}>
      {rows.map(([k, v]) => {
        const val = RISK_VALUE[v.level];
        const pct = (val / 5) * 100;
        // Sequential green → amber → red ramp; label text colours are set per
        // theme in CSS (.risk-profile__level) so they stay readable on paper.
        const band = val <= 1 ? "low" : val <= 2 ? "moderate" : val <= 3 ? "elevated" : val <= 4 ? "high" : "severe";
        const tone = val <= 1 ? "#7ea182" : val <= 2 ? "#d9bd6a" : val <= 3 ? "#e3a05a" : val <= 4 ? "#d4764f" : "#c4553f";
        const trendGlyph = v.trend === "improving" ? "↓" : v.trend === "worsening" ? "↑" : v.trend === "mixed" ? "↕" : "→";
        const trendColor = v.trend === "improving" ? "#4f8a5a" : v.trend === "worsening" ? "#c4683f" : "#7a889c";

        return (
          <div key={k} className="flex items-center gap-3 text-sm" title={v.note ? prose(v.note) : ""} role="listitem">
            <div className="w-28 text-frost">{LABEL[k]}</div>
            <div
              className="flex-1 h-2 rounded-full bg-[rgba(58,77,102,0.35)] overflow-hidden"
              role="meter"
              aria-label={`${LABEL[k]} risk`}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={val}
              aria-valuetext={`${v.level.replace(/-/g, " ")} risk, trend ${v.trend ?? "stable"}`}
            >
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
            </div>
            <div className="w-28 text-right flex items-center justify-end gap-2">
              <span className="risk-profile__level uppercase tracking-wide text-xs" data-band={band}>{v.level.replace("-", " ")}</span>
              <span className="font-mono-num text-xs" style={{ color: trendColor }} aria-label={`trend ${v.trend ?? "stable"}`}>{trendGlyph}</span>
            </div>
          </div>
        );
      })}
      <div className="text-xs text-stone mt-2 flex items-center gap-4">
        <span>↑ worsening</span>
        <span>↓ improving</span>
        <span>↕ mixed</span>
        <span>→ stable</span>
      </div>
    </div>
  );
}
