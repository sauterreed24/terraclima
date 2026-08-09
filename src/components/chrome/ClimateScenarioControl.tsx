/**
 * Climate-scenario layer switch ("2050 time machine") for the Explorer.
 *
 * Flips the whole atlas — ranking, map, cards, compass, analogs — between the
 * recent rolling climatology (1996–2025) and two mid-century CMIP6 layers
 * (SSP2-4.5 / SSP5-8.5). Dossier remains on observed recent normals; the note
 * keeps that honest. Rolling “Now” is not a WMO standard normal.
 */
import { Clock3 } from "lucide-react";
import { SCENARIOS, scenarioMeta } from "../../lib/climate-projection";
import { CLIMATE_ROLLING_DISCLAIMER } from "../../lib/climate-v2/periods";
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
    ? `Recent · 1996–2025 — ${CLIMATE_ROLLING_DISCLAIMER}`
    : `${projecting ? "Projecting… " : ""}${scenarioMeta(scenario).short} (2041–2060) ensemble illustration — dossier still shows recent observed normals.`;

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
