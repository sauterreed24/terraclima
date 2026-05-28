import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../../lib/theme";

interface Props {
  preference: ThemePreference;
  onChange: (next: ThemePreference) => void;
  /** Compact = icons only (used in the mobile site menu / header). */
  compact?: boolean;
}

const OPTIONS: ReadonlyArray<{
  id: ThemePreference;
  label: string;
  /** Single icon glyph drawn when the option is the current preference. */
  Icon: typeof Sun;
  hint: string;
}> = [
  { id: "auto", label: "Auto", Icon: Monitor, hint: "Follow system preference" },
  { id: "light", label: "Light", Icon: Sun, hint: "Always use the bright theme" },
  { id: "dark", label: "Dark", Icon: Moon, hint: "Always use the dark theme" },
];

/**
 * Three-state segmented control: Auto / Light / Dark.
 *
 * Each option is a real `<button>` with `aria-pressed`, keyboard-focusable
 * by default. The active option visually wins; the inactive options stay
 * tappable so users can switch with one click without a popover.
 */
export function ThemeToggle({ preference, onChange, compact = false }: Props) {
  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`tc-theme-toggle${compact ? " tc-theme-toggle--compact" : ""}`}
    >
      {OPTIONS.map(opt => {
        const active = opt.id === preference;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.id}
            type="button"
            className="tc-theme-toggle__btn"
            onClick={() => {
              if (!active) onChange(opt.id);
            }}
            aria-pressed={active}
            aria-label={`${opt.label} theme — ${opt.hint}`}
            title={opt.hint}
            data-active={active ? "true" : "false"}
          >
            <Icon className="tc-theme-toggle__icon" aria-hidden />
            {compact ? null : <span className="tc-theme-toggle__label">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
