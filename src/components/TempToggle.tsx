import { memo } from "react";
import { useUnits } from "../lib/units";

type Props = {
  stretch?: boolean;
  className?: string;
  /** Runs after the unit actually changes (not when tapping the already-active side). */
  onAfterChange?: () => void;
};

export const TempToggle = memo(function TempToggle({ stretch, className = "", onAfterChange }: Props) {
  const { temp, toggle } = useUnits();
  const wrap = `tc-temp-toggle${stretch ? " tc-temp-toggle--stretch" : ""} ${className}`.trim();

  return (
    <div className={wrap} role="group" aria-label="Temperature unit">
      <button
        type="button"
        onClick={() => {
          if (temp === "C") {
            toggle();
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
            toggle();
            onAfterChange?.();
          }
        }}
        className="tc-temp-toggle__btn"
        aria-pressed={temp === "C"}
        title="Switch to degrees Celsius"
      >
        °C
      </button>
    </div>
  );
});
