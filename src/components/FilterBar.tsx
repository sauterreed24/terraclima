import { memo, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { useRovingTabIndex } from "../hooks/use-roving-tabindex";
import type { Country, MicroclimateArchetype, RiskLevel, ScenarioId } from "../types";
import {
  applyLifestyleBundle,
  isBundleActive,
  LIFESTYLE_BUNDLES,
  type LifestyleBundle,
} from "../lib/lifestyle-bundles";
import { createEmptyFilterState, hasActiveExplorerFilters, type FilterState } from "../lib/scoring";
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
import { scenarioMeta } from "../lib/climate-projection";
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
export { LIFESTYLE_BUNDLES, applyLifestyleBundle, isBundleActive } from "../lib/lifestyle-bundles";

const BUNDLE_ICONS: Record<string, LucideIcon> = {
  "remote-work": Laptop,
  "retirement": Sunrise,
  "garden": Sprout,
  "snow-ski": Snowflake,
  "fire-safe": ShieldCheck,
  "shoulder-season": CalendarDays,
};

const COUNTRY_OPTIONS: Country[] = ["USA", "Mexico", "Canada"];

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
  scenario?: ScenarioId;
  onScenarioChange?: (next: ScenarioId) => void;
}

export const FilterBar = memo(function FilterBar({
  searchInputId,
  filters,
  setFilters,
  ranking,
  setRanking,
  variant = "dock",
  scenario = "now",
  onScenarioChange,
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

  const hasAny = hasActiveExplorerFilters(filters);
  const clearAll = useCallback(() => setFilters(createEmptyFilterState()), [setFilters]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasSearch = (filters.search ?? "").length > 0;
  const clearSearch = useCallback(() => {
    setFilters(f => ({ ...f, search: "" }));
    searchInputRef.current?.focus();
  }, [setFilters]);

  // Roving tabindex per chip group: each group is one Tab stop with arrow-key
  // navigation, so keyboard users don't Tab through ~65 individual chips to
  // cross the filter dock. Counts are stable (constant source arrays).
  const presetRoving = useRovingTabIndex(LIVE_FIT_PRESETS.length);
  const bundleRoving = useRovingTabIndex(LIFESTYLE_BUNDLES.length);
  const rankRoving = useRovingTabIndex(RANKING_OPTIONS.length);
  const countryRoving = useRovingTabIndex(COUNTRY_OPTIONS.length);
  const archetypeRoving = useRovingTabIndex(ARCHETYPES.length);

  return (
    <div className="panel contour-bg atlas-filter-dock p-3 space-y-3">
      <label
        htmlFor={searchFieldId}
        className="tc-filter-search-field flex items-center gap-2.5 px-3 py-2.5 rounded-xl tc-surface-elevated border tc-border-warm focus-within:border-[rgba(26,143,168,0.55)] focus-within:ring-2 focus-within:ring-[rgba(94,196,220,0.25)] transition-[border-color,box-shadow] min-h-[2.75rem]"
      >
        <Search className="w-4 h-4 text-stone shrink-0" aria-hidden />
        <input
          id={searchFieldId}
          ref={searchInputRef}
          value={filters.search ?? ""}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder={searchPlaceholder}
          aria-label="Search places by name, region, or archetype"
          enterKeyHint="search"
          autoComplete="off"
          className="bg-transparent text-[15px] text-ice placeholder:text-stone/65 outline-none flex-1 min-w-0"
        />
        {/* In-field × clears the search text only (the universal convention), not
            every filter — clearing all lives in the lens receipt below. Shown
            only when there is a query to clear, and returns focus to the input. */}
        {hasSearch && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="text-stone hover:text-ice flex items-center justify-center min-w-9 min-h-9 sm:min-w-9 sm:min-h-9 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:min-h-11 rounded-lg hover:bg-[rgba(94,196,220,0.1)] -mr-1"
            title="Clear search"
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
        setFilters={setFilters}
        ranking={ranking}
        scenario={scenario}
        onScenarioChange={onScenarioChange}
      />

      <div className="tc-accent-panel p-2.5 space-y-2">
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
              aria-label="Clear Live Finder presets"
            >
              Clear presets
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Live Finder presets">
          {LIVE_FIT_PRESETS.map((preset, idx) => {
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
                {...presetRoving.getItemProps(idx)}
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
      <div className="tc-accent-panel tc-accent-panel--warm p-2.5 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-stone-readable">Lifestyle bundles</div>
        <p className="text-[11px] text-stone-readable leading-snug">One-click compound presets — sets ranking, filters, and Live Finder signals together.</p>
        <div className="grid grid-cols-2 gap-1.5" role="toolbar" aria-label="Lifestyle bundles">
          {LIFESTYLE_BUNDLES.map((bundle, idx) => {
            const isActive = isBundleActive(bundle, ranking, filters);
            return (
              <button
                key={bundle.id}
                type="button"
                aria-pressed={isActive}
                title={bundle.description}
                onClick={() => applyLifestyleBundle(bundle, setRanking, setFilters)}
                className={`lifestyle-bundle-btn${isActive ? " lifestyle-bundle-btn--active" : ""}`}
                {...bundleRoving.getItemProps(idx)}
              >
                <span className="lifestyle-bundle-btn__icon" data-tone={bundle.tone} aria-hidden>
                  {(() => {
                    const Icon = BUNDLE_ICONS[bundle.id];
                    return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
                  })()}
                </span>
                <span className="lifestyle-bundle-btn__label">{bundle.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Rank by</div>
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Rank by">
          {RANKING_OPTIONS.map((opt, idx) => {
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
                {...rankRoving.getItemProps(idx)}
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
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Country">
          {COUNTRY_OPTIONS.map((c, idx) => {
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
                {...countryRoving.getItemProps(idx)}
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
          role="toolbar"
          aria-label="Archetype"
          className={`flex flex-wrap gap-1.5 overflow-y-auto pr-1 no-scrollbar ${
            variant === "sheet" ? "max-h-[min(52dvh,22rem)]" : "max-h-56"
          }`}
        >
          {ARCHETYPES.map((a, idx) => {
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
                {...archetypeRoving.getItemProps(idx)}
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

function clearLiveFinderConstraints(f: FilterState): FilterState {
  return {
    ...f,
    fitPresets: new Set(),
    maxSummerHighC: undefined,
    minWinterLowC: undefined,
    minGrowability: undefined,
    maxFireRisk: undefined,
    maxOverallRisk: undefined,
  };
}

function LensReceipt({
  rankingLabel,
  filters,
  temp,
  activeBundle,
  hasAny,
  onClearAll,
  setFilters,
  ranking,
  scenario = "now",
  onScenarioChange,
}: {
  rankingLabel: string;
  filters: FilterState;
  temp: UnitState["temp"];
  activeBundle: LifestyleBundle | null;
  hasAny: boolean;
  onClearAll: () => void;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  ranking: RankingProfile;
  scenario?: ScenarioId;
  onScenarioChange?: (next: ScenarioId) => void;
}) {
  const liveSignalCount = countLiveSignals(filters);
  const chips: { key: string; label: string; tone?: string; onDismiss?: () => void }[] = [];
  const search = filters.search?.trim();
  const presetCount = filters.fitPresets?.size ?? 0;
  const sortedByLiveFit = ranking === "live-fit";

  if (activeBundle) {
    chips.push({
      key: "bundle",
      label: activeBundle.label,
      tone: activeBundle.tone,
      onDismiss: () => setFilters(f => clearLiveFinderConstraints(f)),
    });
  }
  if (search) {
    chips.push({
      key: "search",
      label: `Search: ${search}`,
      tone: "glacier",
      onDismiss: () => setFilters(f => ({ ...f, search: "" })),
    });
  }
  if (filters.countries.size > 0) {
    chips.push({
      key: "countries",
      label: [...filters.countries].join(", "),
      tone: "ochre",
      onDismiss: () => setFilters(f => ({ ...f, countries: new Set() })),
    });
  }
  if (filters.archetypes.size > 0) {
    chips.push({
      key: "archetypes",
      label: `${filters.archetypes.size} archetype${filters.archetypes.size === 1 ? "" : "s"}`,
      tone: "ice",
      onDismiss: () => setFilters(f => ({ ...f, archetypes: new Set() })),
    });
  }
  if (presetCount > 0) {
    chips.push({
      key: "presets",
      label: `${presetCount} Live Finder preset${presetCount === 1 ? "" : "s"}`,
      tone: "sage",
      onDismiss: () => setFilters(f => ({ ...f, fitPresets: new Set() })),
    });
  }
  if (filters.maxSummerHighC != null) {
    chips.push({
      key: "summer",
      label: `Summer <= ${fmtTemp(filters.maxSummerHighC, temp)}`,
      tone: "glacier",
      onDismiss: () => setFilters(f => ({ ...f, maxSummerHighC: undefined })),
    });
  }
  if (filters.minWinterLowC != null) {
    chips.push({
      key: "winter",
      label: `Winter >= ${fmtTemp(filters.minWinterLowC, temp)}`,
      tone: "ice",
      onDismiss: () => setFilters(f => ({ ...f, minWinterLowC: undefined })),
    });
  }
  if (filters.minGrowability != null) {
    chips.push({
      key: "grow",
      label: `Garden ${filters.minGrowability}+`,
      tone: "sage",
      onDismiss: () => setFilters(f => ({ ...f, minGrowability: undefined })),
    });
  }
  if (filters.maxFireRisk) {
    chips.push({
      key: "fire",
      label: `Fire <= ${RISK_LABELS[filters.maxFireRisk]}`,
      tone: "ember",
      onDismiss: () => setFilters(f => ({ ...f, maxFireRisk: undefined })),
    });
  }
  if (filters.maxOverallRisk) {
    chips.push({
      key: "risk",
      label: `Risk <= ${RISK_LABELS[filters.maxOverallRisk]}`,
      tone: "ochre",
      onDismiss: () => setFilters(f => ({ ...f, maxOverallRisk: undefined })),
    });
  }
  if (scenario !== "now" && onScenarioChange) {
    chips.push({
      key: "scenario",
      label: scenarioMeta(scenario).short,
      tone: "aurora",
      onDismiss: () => onScenarioChange("now"),
    });
  }

  const lensLine = activeBundle
    ? activeBundle.description
    : scenario !== "now"
      ? `${scenarioMeta(scenario).label} — illustrative regional projection reshaping ranks and cards.`
      : liveSignalCount > 0
      ? sortedByLiveFit
        ? `${liveSignalCount} living signal${liveSignalCount === 1 ? "" : "s"} — sorted by live-fit.`
        : `${liveSignalCount} living signal${liveSignalCount === 1 ? "" : "s"} active — switch ranking to Live-fit for aligned sort.`
      : hasAny
        ? "Filtered atlas view with the selected ranking lens."
        : "Broad atlas scan with ranking only.";

  return (
    <section className="lens-receipt" aria-label="Current Explorer lens" aria-live="polite">
      <div className="lens-receipt__head">
        <span className="lens-receipt__icon" aria-hidden>
          <Compass className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="lens-receipt__eyebrow">Current lens</div>
          <div className="lens-receipt__title">{rankingLabel}</div>
        </div>
        {hasAny ? (
          <button
            type="button"
            className="lens-receipt__clear"
            onClick={onClearAll}
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        ) : null}
      </div>
      <p className="lens-receipt__line">{lensLine}</p>
      <div className="lens-receipt__chips" aria-label="Active lens signals">
        {chips.length > 0 ? (
          chips.slice(0, 7).map(chip => (
            chip.onDismiss ? (
              <button
                key={chip.key}
                type="button"
                className="lens-receipt__chip lens-receipt__chip--dismiss"
                data-tone={chip.tone}
                onClick={chip.onDismiss}
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label}
                <X className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
              </button>
            ) : (
              <span key={chip.key} className="lens-receipt__chip" data-tone={chip.tone}>
                {chip.label}
              </span>
            )
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
