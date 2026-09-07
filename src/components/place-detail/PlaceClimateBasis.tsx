import type { Place } from "../../types";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../data/generated/climate-v2";
import { fmtPrecip, useUnits } from "../../lib/units";

/** Keep the grid's scope visible before the reader encounters local prose. */
export function PlaceClimateBasis({ place }: { place: Place }) {
  const { dist } = useUnits();
  const record = CLIMATE_V2_OVERLAY_BY_ID[place.id];
  if (!record) return null;
  return (
    <aside className="tc-climate-basis" aria-label="Climate data basis">
      <div className="tc-climate-basis__heading">
        <span>Reading the numbers</span>
        <strong>1996–2025 · 1 km grid</strong>
      </div>
      <p>
        Temperature and precipitation charts use Daymet estimates at this map pin:
        {" "}<strong>{fmtPrecip(record.climate.annualPrecipMm, dist)} of precipitation per year</strong>,
        including the water equivalent of snow. A town, valley, or exposed ridge can differ from that grid cell.
      </p>
      <details>
        <summary>Sources, local differences &amp; growing seasons</summary>
        <p>
          Local figures in the field notes may describe another station, elevation, or period.
          Use their cited source for that comparison; they are not interchangeable with the chart baseline.
          Sunshine, snowfall, hardiness, and historical context are separate authored fields.
        </p>
        <p>
          {record.validationStatus === "validated"
            ? "This grid estimate has a recorded station validation."
            : record.validationStatus === "reviewed-exception"
              ? "This location has a reviewed grid exception; independent station validation is still pending."
              : "Independent station validation is still pending for this location."}
          {" "}The 1991–2020 comparison is calculated from the same grid for the WMO reference period;
          it is not an official station normal.
        </p>
        <p>
          Non-freezing days count all days with minimum air temperature at or above freezing.
          They need not form one uninterrupted season. For planting, check local frost dates,
          soil temperature, drainage, and water supply.
        </p>
      </details>
    </aside>
  );
}
