import { memo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { Country, MicroclimateArchetype, RiskLevel } from "../types";
import type { FilterState } from "../lib/scoring";
import { ARCHETYPES } from "../data/archetypes";
import type { RankingProfile } from "../lib/scoring";
import { RANKING_OPTIONS } from "../lib/ranking-options";
import {
  LIVE_FIT_GROWABILITY_FLOORS,
  LIVE_FIT_PRESETS,
  LIVE_FIT_RISK_CEILINGS,
  LIVE_FIT_SUMMER_CAPS_C,
  LIVE_FIT_WINTER_FLOORS_C,
  type LiveFitPresetId,
} from "../lib/live-fit";
import {
  CalendarDays,
  Check,
  Compass,
  Laptop,
  Search,
  ShieldCheck,
  Snowflake,
  Sprout,
  Sunrise,
  X,
  type LucideIcon,
} from "lucide-react";
import { fmtTemp, useProse, useUnits, type UnitState } from "../lib/units";

export { RANKING_OPTIONS } from "../lib/ranking-options";

// ── Compound lifestyle bundles ────────────────────────────────────────────────
// Each bundle sets a primary ranking, a set of Live Finder presets,
// and optional numeric constraints — all applied in one click.
interface LifestyleBundle {
  id: string;
  icon: LucideIcon;
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora";
  label: string;
  description: string;
  ranking: RankingProfile;
  presets: LiveFitPresetId[];
  maxSummerHighC?: number;
  minWinterLowC?: number;
  minGrowability?: number;
  maxFireRisk?: RiskLevel;
  maxOverallRisk?: RiskLevel;
}

const LIFESTYLE_BUNDLES: LifestyleBundle[] = [
  {
    id: "remote-work",
    icon: Laptop,
    tone: "glacier",
    label: "Remote Work",
    description: "Cool, productive summers. Low fire & smoke. Mild winters. Ranked by remote-work readiness.",
    ranking: "best-for-remote-work",
    presets: ["cool-summers", "low-fire-smoke"],
    maxSummerHighC: 26,
  },
  {
    id: "retirement",
    icon: Sunrise,
    tone: "ochre",
    label: "Retirement",
    description: "Mild all-year, low aggregate risk, good growability. Ranked by year-round comfort.",
    ranking: "best-retirement",
    presets: ["mild-winters"],
    minWinterLowC: 2,
    maxOverallRisk: "moderate",
  },
  {
    id: "garden",
    icon: Sprout,
    tone: "sage",
    label: "Garden & Grow",
    description: "Long growing season, good soils, frost-free nights. Ranked by growability.",
    ranking: "best-growability",
    presets: ["gardenable"],
    minGrowability: 65,
  },
  {
    id: "snow-ski",
    icon: Snowflake,
    tone: "ice",
    label: "Snow & Ski",
    description: "Real winter with reliable snowpack. Four-season drama. Ranked by coolest summers.",
    ranking: "coolest-summers",
    presets: ["snow-country", "four-seasons"],
  },
  {
    id: "fire-safe",
    icon: ShieldCheck,
    tone: "ember",
    label: "Fire-Safe",
    description: "Low wildfire and smoke exposure. Climate-resilient trajectory. Ranked by resilience.",
    ranking: "climate-resilient",
    presets: ["low-fire-smoke"],
    maxFireRisk: "moderate",
    maxOverallRisk: "moderate",
  },
  {
    id: "shoulder-season",
    icon: CalendarDays,
    tone: "aurora",
    label: "Best Shoulder",
    description: "Ideal spring and autumn conditions. Mild winters, dry air, comfortable year-round.",
    ranking: "best-shoulder-seasons",
    presets: ["mild-winters", "dry-air"],
  },
];

function samePresetSet(actual: Set<LiveFitPresetId> | undefined, expected: readonly LiveFitPresetId[]): boolean {
  if ((actual?.size ?? 0) !== expected.length) return false;
  return expected.every(preset => actual?.has(preset));
}

function isBundleActive(bundle: LifestyleBundle, ranking: RankingProfile, filters: FilterState): boolean {
  return ranking === bundle.ranking &&
    samePresetSet(filters.fitPresets, bundle.presets) &&
    filters.maxSummerHighC === bundle.maxSummerHighC &&
    filters.minWinterLowC === bundle.minWinterLowC &&
    filters.minGrowability === bundle.minGrowability &&
    filters.maxFireRisk === bundle.maxFireRisk &&
    filters.maxOverallRisk === bundle.maxOverallRisk;
}

function countLiveSignals(filters: FilterState): number {
  return (filters.fitPresets?.size ?? 0) + [
    filters.maxSummerHighC,
    filters.minWinterLowC,
    filters.minGrowability,
    filters.maxFireRisk,
    filters.maxOverallRisk,
  ].filter(v => v != null).length;
}

interface Props {
  searchInputId?: string;
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  ranking: RankingProfile;
  setRanking: (r: RankingProfile) => void;
  /** Taller archetype scroller inside the mobile filter dialog. */
  variant?: "dock" | "sheet";
}

export const FilterBar = memo(function FilterBar({
  searchInputId,
  filters,
  setFilters,
  ranking,
  setRanking,
  variant = "dock",
}: Props) {
  const prose = useProse();
  const { temp } = useUnits();
  const searchFieldId = searchInputId ?? "tc-atlas-filter-search";
  const searchPlaceholder = variant === "sheet" ? "Search places" : "Search places or regions";
  const rankingLabel = RANKING_OPTIONS.find(opt => opt.id === ranking)?.label ?? ranking;
  const activeBundle = LIFESTYLE_BUNDLES.find(bundle => isBundleActive(bundle, ranking, filters)) ?? null;
  const toggleCountry = useCallback((c: Country) => {
    setFilters(f => {
      const ns = new Set(f.countries);
      if (ns.has(c)) ns.delete(c); else ns.add(c);
      return { ...f, countries: ns };
    });
  }, [setFilters]);
  const toggleArchetype = useCallback((a: MicroclimateArchetype) => {
    setFilters(f => {
      const ns = new Set(f.archetypes);
      if (ns.has(a)) ns.delete(a); else ns.add(a);
      return { ...f, archetypes: ns };
    });
  }, [setFilters]);
  const toggleFitPreset = useCallback((id: LiveFitPresetId) => {
    setFilters(f => {
      const ns = new Set(f.fitPresets ?? []);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return { ...f, fitPresets: ns };
    });
  }, [setFilters]);
  const setLiveNumber = useCallback((key: "maxSummerHighC" | "minWinterLowC" | "minGrowability", value: number | undefined) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, [setFilters]);
  const setLiveRisk = useCallback((key: "maxFireRisk" | "maxOverallRisk", value: RiskLevel | undefined) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, [setFilters]);

  const hasAny =
    filters.countries.size > 0 ||
    filters.archetypes.size > 0 ||
    (filters.fitPresets?.size ?? 0) > 0 ||
    (filters.search?.length ?? 0) > 0 ||
    filters.maxSummerHighC != null ||
    filters.minWinterLowC != null ||
    filters.minGrowability != null ||
    filters.maxFireRisk != null ||
    filters.maxOverallRisk != null;
  const clearAll = useCallback(() => setFilters({ countries: new Set(), archetypes: new Set(), fitPresets: new Set(), search: "" }), [setFilters]);

  return (
    <div className="panel contour-bg atlas-filter-dock p-3 space-y-3">
      <label
        htmlFor={searchFieldId}
        className="tc-filter-search-field flex items-center gap-2.5 px-3 py-2.5 rounded-xl tc-surface-elevated border tc-border-warm focus-within:border-[rgba(26,143,168,0.55)] focus-within:ring-2 focus-within:ring-[rgba(94,196,220,0.25)] transition-[border-color,box-shadow] min-h-[2.75rem]"
      >
        <Search className="w-4 h-4 text-stone shrink-0" aria-hidden />
        <input
          id={searchFieldId}
          value={filters.search ?? ""}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder={searchPlaceholder}
          aria-label="Search places by name, region, or archetype"
          enterKeyHint="search"
          autoComplete="off"
          className="bg-transparent text-[15px] text-ice placeholder:text-stone/65 outline-none flex-1 min-w-0"
        />
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Clear all filters"
            className="text-stone hover:text-ice flex items-center justify-center min-w-9 min-h-9 sm:min-w-9 sm:min-h-9 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:min-h-11 rounded-lg hover:bg-[rgba(94,196,220,0.1)] -mr-1"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </label>

      <LensReceipt
        rankingLabel={rankingLabel}
        filters={filters}
        temp={temp}
        activeBundle={activeBundle}
        hasAny={hasAny}
        onClearAll={clearAll}
      />

      <div className="rounded-xl border border-[rgba(26,143,168,0.2)] bg-[rgba(232,248,251,0.42)] p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-readable">Live Finder</div>
            <div className="text-[11px] text-stone-readable leading-snug">Pick the life you are scouting for; cards explain fit and tradeoffs.</div>
          </div>
          {(filters.fitPresets?.size ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, fitPresets: new Set() }))}
              className="text-stone hover:text-ice normal-case text-[11px] tracking-normal shrink-0"
            >
              clear
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LIVE_FIT_PRESETS.map(preset => {
            const isActive = filters.fitPresets?.has(preset.id) ?? false;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => toggleFitPreset(preset.id)}
                className="chip chip-btn"
                data-tone={isActive ? "glacier" : undefined}
                data-active={isActive}
                aria-pressed={isActive}
                title={preset.description}
              >
                {isActive ? <Check className="w-3 h-3 -ml-0.5 mr-0.5" aria-hidden /> : null}
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-2">
          <ConstraintRow
            label="Summer cap"
            value={filters.maxSummerHighC}
            options={[
              { label: "None", value: undefined },
              ...LIVE_FIT_SUMMER_CAPS_C.map(value => ({ label: `<= ${fmtTemp(value, temp)}`, value })),
            ]}
            onPick={v => setLiveNumber("maxSummerHighC", v)}
          />
          <ConstraintRow
            label="Winter floor"
            value={filters.minWinterLowC}
            options={[
              { label: "None", value: undefined },
              ...LIVE_FIT_WINTER_FLOORS_C.map(value => ({ label: `>= ${fmtTemp(value, temp)}`, value })),
            ]}
            onPick={v => setLiveNumber("minWinterLowC", v)}
          />
          <ConstraintRow
            label="Garden floor"
            value={filters.minGrowability}
            options={[
              { label: "None", value: undefined },
              ...LIVE_FIT_GROWABILITY_FLOORS.map(value => ({ label: `${value}+`, value })),
            ]}
            onPick={v => setLiveNumber("minGrowability", v)}
          />
          <RiskConstraintRow
            label="Fire ceiling"
            value={filters.maxFireRisk}
            onPick={v => setLiveRisk("maxFireRisk", v)}
          />
          <RiskConstraintRow
            label="Risk ceiling"
            value={filters.maxOverallRisk}
            onPick={v => setLiveRisk("maxOverallRisk", v)}
          />
        </div>
      </div>

      {/* ── Lifestyle bundles ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[rgba(232,155,32,0.22)] bg-[rgba(255,248,236,0.48)] p-2.5 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-stone-readable">Lifestyle bundles</div>
        <p className="text-[11px] text-stone-readable leading-snug">One-click compound presets — sets ranking, filters, and Live Finder signals together.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {LIFESTYLE_BUNDLES.map(bundle => {
            const isActive = isBundleActive(bundle, ranking, filters);
            return (
              <button
                key={bundle.id}
                type="button"
                aria-pressed={isActive}
                title={bundle.description}
                onClick={() => {
                  setRanking(bundle.ranking);
                  setFilters(f => ({
                    ...f,
                    fitPresets: new Set(bundle.presets),
                    // Bundles own the Live Finder constraint surface; keep text, country,
                    // and archetype filters, but clear stale fit constraints from older modes.
                    maxSummerHighC: bundle.maxSummerHighC,
                    minWinterLowC: bundle.minWinterLowC,
                    minGrowability: bundle.minGrowability,
                    maxFireRisk: bundle.maxFireRisk,
                    maxOverallRisk: bundle.maxOverallRisk,
                  }));
                }}
                className={`lifestyle-bundle-btn${isActive ? " lifestyle-bundle-btn--active" : ""}`}
              >
                <span className="lifestyle-bundle-btn__icon" data-tone={bundle.tone} aria-hidden>
                  <bundle.icon className="w-3.5 h-3.5" />
                </span>
                <span className="lifestyle-bundle-btn__label">{bundle.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Rank by</div>
        <div className="flex flex-wrap gap-1.5">
          {RANKING_OPTIONS.map(opt => {
            const isActive = ranking === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRanking(opt.id)}
                className="chip chip-btn"
                data-tone={isActive ? "glacier" : undefined}
                data-active={isActive}
                aria-pressed={isActive}
              >
                {isActive ? <Check className="w-3 h-3 -ml-0.5 mr-0.5" aria-hidden /> : null}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Country</div>
        <div className="flex flex-wrap gap-1.5">
          {(["USA", "Mexico", "Canada"] as Country[]).map(c => {
            const isActive = filters.countries.has(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCountry(c)}
                className="chip chip-btn"
                data-tone={isActive ? "ochre" : undefined}
                data-active={isActive}
                aria-pressed={isActive}
              >
                {isActive ? <Check className="w-3 h-3 -ml-0.5 mr-0.5" aria-hidden /> : null}
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5 flex items-center justify-between">
          <span>Archetype</span>
          {filters.archetypes.size > 0 && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, archetypes: new Set() }))}
              className="text-stone hover:text-ice normal-case text-[11px] tracking-normal"
            >
              clear · {filters.archetypes.size}
            </button>
          )}
        </div>
        <div
          className={`flex flex-wrap gap-1.5 overflow-y-auto pr-1 no-scrollbar ${
            variant === "sheet" ? "max-h-[min(52dvh,22rem)]" : "max-h-56"
          }`}
        >
          {ARCHETYPES.map(a => {
            const isActive = filters.archetypes.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleArchetype(a.id)}
                className="chip chip-btn"
                data-tone={isActive ? a.tone : undefined}
                data-active={isActive}
                aria-pressed={isActive}
                title={prose(a.blurb)}
              >
                {isActive ? <Check className="w-3 h-3 -ml-0.5 mr-0.5" aria-hidden /> : null}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function LensReceipt({
  rankingLabel,
  filters,
  temp,
  activeBundle,
  hasAny,
  onClearAll,
}: {
  rankingLabel: string;
  filters: FilterState;
  temp: UnitState["temp"];
  activeBundle: LifestyleBundle | null;
  hasAny: boolean;
  onClearAll: () => void;
}) {
  const liveSignalCount = countLiveSignals(filters);
  const chips: { label: string; tone?: string }[] = [];
  const search = filters.search?.trim();
  const presetCount = filters.fitPresets?.size ?? 0;

  if (activeBundle) chips.push({ label: activeBundle.label, tone: activeBundle.tone });
  if (search) chips.push({ label: `Search: ${search}`, tone: "glacier" });
  if (filters.countries.size > 0) chips.push({ label: [...filters.countries].join(", "), tone: "ochre" });
  if (filters.archetypes.size > 0) chips.push({ label: `${filters.archetypes.size} archetype${filters.archetypes.size === 1 ? "" : "s"}`, tone: "ice" });
  if (presetCount > 0) chips.push({ label: `${presetCount} Live Finder preset${presetCount === 1 ? "" : "s"}`, tone: "sage" });
  if (filters.maxSummerHighC != null) chips.push({ label: `Summer <= ${fmtTemp(filters.maxSummerHighC, temp)}`, tone: "glacier" });
  if (filters.minWinterLowC != null) chips.push({ label: `Winter >= ${fmtTemp(filters.minWinterLowC, temp)}`, tone: "ice" });
  if (filters.minGrowability != null) chips.push({ label: `Garden ${filters.minGrowability}+`, tone: "sage" });
  if (filters.maxFireRisk) chips.push({ label: `Fire <= ${RISK_LABELS[filters.maxFireRisk]}`, tone: "ember" });
  if (filters.maxOverallRisk) chips.push({ label: `Risk <= ${RISK_LABELS[filters.maxOverallRisk]}`, tone: "ochre" });

  const lensLine = activeBundle
    ? activeBundle.description
    : liveSignalCount > 0
      ? `${liveSignalCount} living signal${liveSignalCount === 1 ? "" : "s"} active against the current ranking.`
      : hasAny
        ? "Filtered atlas view with the selected ranking lens."
        : "Broad atlas scan with ranking only.";

  return (
    <section className="lens-receipt" aria-label="Current Explorer lens">
      <div className="lens-receipt__head">
        <span className="lens-receipt__icon" aria-hidden>
          <Compass className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="lens-receipt__eyebrow">Current lens</div>
          <div className="lens-receipt__title">{rankingLabel}</div>
        </div>
        {hasAny ? (
          <button type="button" className="lens-receipt__clear" onClick={onClearAll}>
            Clear
          </button>
        ) : null}
      </div>
      <p className="lens-receipt__line">{lensLine}</p>
      <div className="lens-receipt__chips" aria-label="Active lens signals">
        {chips.length > 0 ? (
          chips.slice(0, 7).map(chip => (
            <span key={chip.label} className="lens-receipt__chip" data-tone={chip.tone}>
              {chip.label}
            </span>
          ))
        ) : (
          <span className="lens-receipt__chip" data-tone="glacier">
            Full atlas
          </span>
        )}
      </div>
    </section>
  );
}

function ConstraintRow({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: number | undefined;
  options: { label: string; value: number | undefined }[];
  onPick: (value: number | undefined) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-stone-readable shrink-0">{label}</span>
      <div className="flex flex-wrap justify-end gap-1">
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={`${label}-${opt.label}`}
              type="button"
              onClick={() => onPick(opt.value)}
              className="chip chip-btn"
              data-tone={active ? "sage" : undefined}
              data-active={active}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskConstraintRow({
  label,
  value,
  onPick,
}: {
  label: string;
  value: RiskLevel | undefined;
  onPick: (value: RiskLevel | undefined) => void;
}) {
  const options: { label: string; value: RiskLevel | undefined }[] = [
    { label: "None", value: undefined },
    ...LIVE_FIT_RISK_CEILINGS.map(value => ({ label: RISK_LABELS[value], value })),
  ];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-stone-readable shrink-0">{label}</span>
      <div className="flex flex-wrap justify-end gap-1">
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={`${label}-${opt.label}`}
              type="button"
              onClick={() => onPick(opt.value)}
              className="chip chip-btn"
              data-tone={active ? "ochre" : undefined}
              data-active={active}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const RISK_LABELS: Record<RiskLevel, string> = {
  "very-low": "Very low",
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  high: "High",
  "very-high": "Very high",
};
