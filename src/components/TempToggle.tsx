import { memo } from "react";
import { useUnits } from "../lib/units";

type Props = {
  stretch?: boolean;
  className?: string;
  /** Runs after the unit actually changes (not when tapping the already-active side). */
  onAfterChange?: () => void;
};

const FAHRENHEIT_LABEL = "Use Fahrenheit temperatures";
const CELSIUS_LABEL = "Use Celsius temperatures";
const IMPERIAL_DISTANCE_LABEL = "Use miles, feet, and inches";
const METRIC_DISTANCE_LABEL = "Use kilometers, meters, and millimeters";

export const TempToggle = memo(function TempToggle({ stretch, className = "", onAfterChange }: Props) {
  const { temp, dist, setTemp, setDist } = useUnits();
  const wrap = `tc-temp-toggle${stretch ? " tc-temp-toggle--stretch" : ""} ${className}`.trim();

  return (
    <div className={wrap} role="group" aria-label="Units">
      <button
        type="button"
        onClick={() => {
          if (temp === "C") {
            setTemp("F");
            onAfterChange?.();
          }
        }}
        className="tc-temp-toggle__btn"
        aria-pressed={temp === "F"}
        aria-label={FAHRENHEIT_LABEL}
        title={FAHRENHEIT_LABEL}
      >
        °F
      </button>
      <button
        type="button"
        onClick={() => {
          if (temp === "F") {
            setTemp("C");
            onAfterChange?.();
          }
        }}
        className="tc-temp-toggle__btn"
        aria-pressed={temp === "C"}
        aria-label={CELSIUS_LABEL}
        title={CELSIUS_LABEL}
      >
        °C
      </button>
      <button
        type="button"
        onClick={() => {
          if (dist === "metric") {
            setDist("imperial");
            onAfterChange?.();
          }
        }}
        className="tc-temp-toggle__btn tc-temp-toggle__btn--distance"
        aria-pressed={dist === "imperial"}
        aria-label={IMPERIAL_DISTANCE_LABEL}
        title={IMPERIAL_DISTANCE_LABEL}
      >
        mi
      </button>
      <button
        type="button"
        onClick={() => {
          if (dist === "imperial") {
            setDist("metric");
            onAfterChange?.();
          }
        }}
        className="tc-temp-toggle__btn"
        aria-pressed={dist === "metric"}
        aria-label={METRIC_DISTANCE_LABEL}
        title={METRIC_DISTANCE_LABEL}
      >
        km
      </button>
    </div>
  );
});
