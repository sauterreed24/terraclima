/**
 * Climate-scenario layer switch ("2050 time machine") for the Explorer.
 *
 * Flips the whole atlas — ranking, map, cards, compass, analogs — between the
 * authored present-day normals and two illustrative mid-century CMIP6 layers
 * (SSP2-4.5 / SSP5-8.5). The projection is a coarse, sourced REGIONAL anomaly,
 * not a downscaled per-site forecast, and the dossier still shows present-day
 * normals; the note keeps that honest.
 */
import { Clock3 } from "lucide-react";
import { SCENARIOS, scenarioMeta } from "../../lib/climate-projection";
import type { ScenarioId } from "../../types";

export function ClimateScenarioControl({
  scenario,
  onChange,
  projecting = false,
}: {
  scenario: ScenarioId;
  onChange: (scenario: ScenarioId) => void;
  projecting?: boolean;
}) {
  const note = scenario === "now"
    ? "Present-day normals (1991–2020)."
    : `${projecting ? "Projecting… " : ""}Illustrative ${scenarioMeta(scenario).label} regional projection — dossier still shows present-day normals.`;

  return (
    <div
      className="climate-scenario panel-thin"
      role="group"
      aria-label="Climate scenario layer"
      aria-busy={projecting || undefined}
    >
      <span className="climate-scenario__label">
        <Clock3 className="w-3.5 h-3.5" aria-hidden /> Climate layer
      </span>
      <div className="climate-scenario__seg">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            type="button"
            className="climate-scenario__opt"
            data-active={scenario === s.id}
            aria-pressed={scenario === s.id}
            title={s.description}
            onClick={() => onChange(s.id)}
          >
            {s.short}
          </button>
        ))}
      </div>
      <span className="climate-scenario__note" aria-live="polite">{note}</span>
    </div>
  );
}
