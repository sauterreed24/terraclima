import { memo } from "react";
import { useUnits } from "../lib/units";

type Props = {
  stretch?: boolean;
  className?: string;
  /** Runs after the unit actually changes (not when tapping the already-active side). */
  onAfterChange?: () => void;
};

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
        title="Use Fahrenheit"
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
        title="Switch to degrees Celsius"
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
        title="Use miles, feet, and inches"
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
        title="Use kilometers, meters, and millimeters"
      >
        km
      </button>
    </div>
  );
});
