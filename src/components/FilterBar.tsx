import { memo, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { ARCHETYPE_LABELS, type Country, type MicroclimateArchetype, type RiskLevel, type ScenarioId } from "../types";
import {
  applyLifestyleBundle,
  isBundleActive,
  LIFESTYLE_BUNDLE_GROUPS,
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
  LIVE_FIT_PRESET_BY_ID,
  LIVE_FIT_RISK_CEILINGS,
  LIVE_FIT_SUMMER_CAPS_C,
  LIVE_FIT_WINTER_FLOORS_C,
  type LiveFitPresetId,
} from "../lib/live-fit";
import { scenarioMeta } from "../lib/climate-projection";
import {
  Check,
  Compass,
  Search,
  X,
} from "lucide-react";
import { fmtTemp, useProse, useUnits, type UnitState } from "../lib/units";

export { RANKING_OPTIONS } from "../lib/ranking-options";
export { LIFESTYLE_BUNDLES, applyLifestyleBundle, isBundleActive } from "../lib/lifestyle-bundles";

function countLiveSignals(filters: FilterState): number {
  return (filters.fitPresets?.size ?? 0) + [
    filters.maxSummerHighC,
    filters.minWinterLowC,
    filters.minGrowability,
    filters.maxFireRisk,
    filters.maxOverallRisk,
  ].filter(v => v != null).length;
}

function rankingOptionLabel(id: RankingProfile): string {
  return RANKING_OPTIONS.find(option => option.id === id)?.label ?? id.replace(/-/g, " ");
}

const COUNTRY_LABELS: Record<Country, string> = {
  USA: "U.S.",
  Canada: "Canada",
  Mexico: "Mexico",
};

const COUNTRY_FILTER_LABELS: Record<Country, string> = {
  USA: "United States",
  Canada: "Canada",
  Mexico: "Mexico",
};

function countryFilterActionLabel(country: Country, active: boolean): string {
  return active
    ? `Remove ${COUNTRY_FILTER_LABELS[country]} country filter`
    : `Filter to ${COUNTRY_FILTER_LABELS[country]} places`;
}

function compactList(labels: readonly string[], limit = 3): string {
  if (labels.length <= limit) return labels.join(" + ");
  return `${labels.slice(0, limit).join(" + ")} + ${labels.length - limit} more`;
}

function bundleScopeFull(bundle: LifestyleBundle): string | null {
  const parts: string[] = [];
  if (bundle.countries?.length) {
    parts.push(`Region: ${bundle.countries.map(country => COUNTRY_LABELS[country]).join(" + ")}`);
  }
  if (bundle.archetypes?.length) {
    parts.push(`Terrain: ${bundle.archetypes.map(archetype => ARCHETYPE_LABELS[archetype]).join(" + ")}`);
  }
  return parts.length ? parts.join(" \u00b7 ") : null;
}

function bundleScopeCompact(bundle: LifestyleBundle): string | undefined {
  const parts: string[] = [];
  if (bundle.countries?.length) {
    parts.push(bundle.countries.map(country => COUNTRY_LABELS[country]).join(" + "));
  }
  if (bundle.archetypes?.length) {
    parts.push(compactList(bundle.archetypes.map(archetype => ARCHETYPE_LABELS[archetype])));
  }
  return parts.length ? parts.join(" \u00b7 ") : undefined;
}

function bundleAppliedSummaryParts(bundle: LifestyleBundle, temp: UnitState["temp"]): string[] {
  const parts = [
    `Rank: ${rankingOptionLabel(bundle.ranking)}`,
    ...bundle.presets.map(preset => `Fit: ${LIVE_FIT_PRESET_BY_ID[preset]?.shortLabel ?? preset}`),
  ];
  const scope = bundleScopeFull(bundle);
  if (scope) parts.push(scope);
  if (bundle.maxSummerHighC != null) parts.push(`Summer <= ${fmtTemp(bundle.maxSummerHighC, temp)}`);
  if (bundle.minWinterLowC != null) parts.push(`Winter >= ${fmtTemp(bundle.minWinterLowC, temp)}`);
  if (bundle.minGrowability != null) parts.push(`Garden ${bundle.minGrowability}+`);
  if (bundle.maxFireRisk) parts.push(`Fire <= ${RISK_LABELS[bundle.maxFireRisk]}`);
  if (bundle.maxOverallRisk) parts.push(`Risk <= ${RISK_LABELS[bundle.maxOverallRisk]}`);
  return parts;
}

function compactRiskLabel(level: RiskLevel): string {
  if (level === "moderate") return "mod.";
  if (level === "very-high") return "very high";
  return level;
}

function bundleAppliedRead(bundle: LifestyleBundle, temp: UnitState["temp"]): {
  full: string;
  rank: string;
  signals: string;
  scope?: string;
} {
  const signalParts = bundle.presets.map(preset => LIVE_FIT_PRESET_BY_ID[preset]?.shortLabel ?? preset);
  if (bundle.maxSummerHighC != null) signalParts.push(`summer <= ${fmtTemp(bundle.maxSummerHighC, temp)}`);
  if (bundle.minWinterLowC != null) signalParts.push(`winter ${fmtTemp(bundle.minWinterLowC, temp)}+`);
  if (bundle.minGrowability != null) signalParts.push(`growability ${bundle.minGrowability}+`);
  if (bundle.maxFireRisk) signalParts.push(`${compactRiskLabel(bundle.maxFireRisk)} fire`);
  if (bundle.maxOverallRisk) signalParts.push(`${compactRiskLabel(bundle.maxOverallRisk)} risk`);

  return {
    full: bundleAppliedSummaryParts(bundle, temp).join(" \u00b7 "),
    rank: rankingOptionLabel(bundle.ranking),
    signals: signalParts.length > 0 ? signalParts.join(" \u00b7 ") : "ranking only",
    scope: bundleScopeCompact(bundle),
  };
}

interface Props {
  searchInputId?: string;
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  ranking: RankingProfile;
  setRanking: (r: RankingProfile) => void;
  /**
   * Full Explorer reset (filters + curated collection + auto live-fit ranking).
   * When omitted, Clear all only empties FilterState — prefer wiring App.clearAllFilters.
   */
  onClearAll?: () => void;
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
  onClearAll,
  variant = "dock",
  scenario = "now",
  onScenarioChange,
}: Props) {
  const prose = useProse();
  const { temp } = useUnits();
  const searchFieldId = searchInputId ?? "tc-atlas-filter-search";
  const rankingSelectId = `${searchFieldId}-ranking`;
  const fitFinderTitleId = `${searchFieldId}-fit-finder-title`;
  const liveControlBaseId = `${searchFieldId}-live`;
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
  const applyBundle = useCallback((bundle: LifestyleBundle) => {
    applyLifestyleBundle(bundle, setRanking, setFilters);
  }, [setFilters, setRanking]);

  const hasAny = hasActiveExplorerFilters(filters);
  const clearAll = useCallback(() => {
    if (onClearAll) {
      onClearAll();
      return;
    }
    setFilters(createEmptyFilterState());
  }, [onClearAll, setFilters]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasSearch = (filters.search ?? "").length > 0;
  const clearSearch = useCallback(() => {
    setFilters(f => ({ ...f, search: "" }));
    searchInputRef.current?.focus();
  }, [setFilters]);
  const clearArchetypesLabel =
    filters.archetypes.size === 1
      ? "Clear 1 archetype filter"
      : `Clear ${filters.archetypes.size} archetype filters`;

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
          onKeyDown={event => {
            if (event.key !== "Escape" || event.currentTarget.value.length === 0) return;
            event.preventDefault();
            event.stopPropagation();
            clearSearch();
          }}
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
        hideClearAll={variant === "sheet"}
      />

      {variant === "sheet" ? (
        <div className="tc-filter-sheet-rank-bar">
          <div className="rank-menu">
            <label htmlFor={rankingSelectId} className="rank-menu__field">
              <span className="rank-menu__label">Rank by</span>
              <span className="rank-menu__select-wrap">
                <select
                  id={rankingSelectId}
                  value={ranking}
                  onChange={event => setRanking(event.currentTarget.value as RankingProfile)}
                  className="rank-menu__select"
                  aria-describedby={`${rankingSelectId}-hint`}
                >
                  {RANKING_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </span>
            </label>
            <p id={`${rankingSelectId}-hint`} className="rank-menu__hint">
              Current list and map: {rankingLabel}
            </p>
          </div>
          {hasAny ? (
            <button
              type="button"
              className="lens-receipt__clear"
              onClick={clearAll}
              aria-label="Clear all filters"
              title="Clear all filters"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}

      {variant === "sheet" ? (
        <details className="tc-filter-sheet-details">
          <summary className="tc-filter-sheet-details__summary">Fit Finder</summary>
          <FitFinderPanel
            searchFieldId={searchFieldId}
            fitFinderTitleId={fitFinderTitleId}
            ranking={ranking}
            filters={filters}
            activeBundle={activeBundle}
            temp={temp}
            applyBundle={applyBundle}
          />
        </details>
      ) : (
        <FitFinderPanel
          searchFieldId={searchFieldId}
          fitFinderTitleId={fitFinderTitleId}
          ranking={ranking}
          filters={filters}
          activeBundle={activeBundle}
          temp={temp}
          applyBundle={applyBundle}
        />
      )}

      {variant === "sheet" ? (
        <details className="tc-filter-sheet-details">
          <summary className="tc-filter-sheet-details__summary">Live Finder signals</summary>
          <LiveFinderPanel
            filters={filters}
            temp={temp}
            liveControlBaseId={liveControlBaseId}
            setFilters={setFilters}
            toggleFitPreset={toggleFitPreset}
            setLiveNumber={setLiveNumber}
            setLiveRisk={setLiveRisk}
          />
        </details>
      ) : (
        <LiveFinderPanel
          filters={filters}
          temp={temp}
          liveControlBaseId={liveControlBaseId}
          setFilters={setFilters}
          toggleFitPreset={toggleFitPreset}
          setLiveNumber={setLiveNumber}
          setLiveRisk={setLiveRisk}
        />
      )}

      {variant === "dock" ? (
        <div className="rank-menu">
          <label htmlFor={rankingSelectId} className="rank-menu__field">
            <span className="rank-menu__label">Rank by</span>
            <span className="rank-menu__select-wrap">
              <select
                id={rankingSelectId}
                value={ranking}
                onChange={event => setRanking(event.currentTarget.value as RankingProfile)}
                className="rank-menu__select"
                aria-describedby={`${rankingSelectId}-hint`}
              >
                {RANKING_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </span>
          </label>
          <p id={`${rankingSelectId}-hint`} className="rank-menu__hint">
            Current list and map: {rankingLabel}
          </p>
        </div>
      ) : null}

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Country</div>
        <div className="flex flex-wrap gap-1.5">
          {(["USA", "Mexico", "Canada"] as Country[]).map(c => {
            const isActive = filters.countries.has(c);
            const actionLabel = countryFilterActionLabel(c, isActive);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCountry(c)}
                className="chip chip-btn"
                data-tone={isActive ? "ochre" : undefined}
                data-active={isActive}
                aria-pressed={isActive}
                aria-label={actionLabel}
                title={actionLabel}
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
              aria-label={clearArchetypesLabel}
              title={clearArchetypesLabel}
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

function FitFinderPanel({
  searchFieldId,
  fitFinderTitleId,
  ranking,
  filters,
  activeBundle,
  temp,
  applyBundle,
}: {
  searchFieldId: string;
  fitFinderTitleId: string;
  ranking: RankingProfile;
  filters: FilterState;
  activeBundle: LifestyleBundle | null;
  temp: UnitState["temp"];
  applyBundle: (bundle: LifestyleBundle) => void;
}) {
  return (
    <section className="fit-finder-panel" aria-labelledby={fitFinderTitleId}>
      <div className="fit-finder-panel__head">
        <div>
          <div id={fitFinderTitleId} className="fit-finder-panel__eyebrow">Fit Finder</div>
          <p className="fit-finder-panel__intro">
            Start with what you are escaping or seeking; each path applies the existing ranking and Live Finder constraints.
          </p>
        </div>
        {activeBundle ? (
          <span className="fit-finder-panel__active" data-tone={activeBundle.tone}>
            {activeBundle.cue}
          </span>
        ) : null}
      </div>
      <div className="fit-finder-panel__grid" aria-label="Guided climate-fit paths">
        {LIFESTYLE_BUNDLE_GROUPS.map(group => {
          const groupBundles = LIFESTYLE_BUNDLES.filter(bundle => bundle.group === group.id);
          if (groupBundles.length === 0) return null;
          const groupTitleId = `${searchFieldId}-fit-group-${group.id}`;
          return (
            <div key={group.id} className="fit-finder-panel__lane" role="group" aria-labelledby={groupTitleId}>
              <div className="fit-finder-panel__lane-head">
                <span id={groupTitleId} className="fit-finder-panel__lane-title">{group.label}</span>
                <span className="fit-finder-panel__lane-cue">{group.cue}</span>
              </div>
              <div className="fit-finder-panel__lane-grid">
                {groupBundles.map(bundle => {
                  const isActive = isBundleActive(bundle, ranking, filters);
                  const descId = `${searchFieldId}-fit-${bundle.id}-desc`;
                  const appliesId = `${searchFieldId}-fit-${bundle.id}-applies`;
                  const appliedRead = bundleAppliedRead(bundle, temp);
                  const actionLabel = isActive
                    ? `${bundle.label} Fit Finder path is active`
                    : `Apply ${bundle.label} Fit Finder path`;
                  return (
                    <button
                      key={bundle.id}
                      type="button"
                      className="fit-finder-panel__path"
                      data-tone={bundle.tone}
                      data-active={isActive}
                      aria-pressed={isActive}
                      aria-label={actionLabel}
                      aria-describedby={`${descId} ${appliesId}`}
                      title={actionLabel}
                      onClick={() => applyBundle(bundle)}
                    >
                      <span className="fit-finder-panel__path-top">
                        <span className="fit-finder-panel__path-label">{bundle.label}</span>
                        {isActive ? <Check className="fit-finder-panel__check" aria-hidden /> : null}
                      </span>
                      <span className="fit-finder-panel__cue">{bundle.cue}</span>
                      <span id={descId} className="fit-finder-panel__desc">{bundle.description}</span>
                      <span
                        id={appliesId}
                        className="fit-finder-panel__applies"
                        aria-label={`${bundle.label} applied settings: ${appliedRead.full}`}
                        title={appliedRead.full}
                      >
                        <span className="fit-finder-panel__applies-row">
                          <span className="fit-finder-panel__applies-kicker">Rank</span>
                          <span className="fit-finder-panel__applies-copy">{appliedRead.rank}</span>
                        </span>
                        <span className="fit-finder-panel__applies-row">
                          <span className="fit-finder-panel__applies-kicker">Signals</span>
                          <span className="fit-finder-panel__applies-copy">{appliedRead.signals}</span>
                        </span>
                        {appliedRead.scope ? (
                          <span className="fit-finder-panel__applies-row">
                            <span className="fit-finder-panel__applies-kicker">Scope</span>
                            <span className="fit-finder-panel__applies-copy">{appliedRead.scope}</span>
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LiveFinderPanel({
  filters,
  temp,
  liveControlBaseId,
  setFilters,
  toggleFitPreset,
  setLiveNumber,
  setLiveRisk,
}: {
  filters: FilterState;
  temp: UnitState["temp"];
  liveControlBaseId: string;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  toggleFitPreset: (id: LiveFitPresetId) => void;
  setLiveNumber: (key: "maxSummerHighC" | "minWinterLowC" | "minGrowability", value: number | undefined) => void;
  setLiveRisk: (key: "maxFireRisk" | "maxOverallRisk", value: RiskLevel | undefined) => void;
}) {
  return (
    <div className="tc-accent-panel p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-readable">Live Finder signals</div>
          <div className="text-[11px] text-stone-readable leading-snug">Fine-tune the path; cards explain fit and tradeoffs.</div>
        </div>
        {(filters.fitPresets?.size ?? 0) > 0 ? (
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, fitPresets: new Set() }))}
            className="text-stone hover:text-ice normal-case text-[11px] tracking-normal shrink-0"
            aria-label="Clear Live Finder presets"
            title="Clear Live Finder presets"
          >
            Clear presets
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
      <div className="live-filter-controls">
        <ConstraintSelectRow
          id={`${liveControlBaseId}-summer-cap`}
          label="Summer cap"
          value={filters.maxSummerHighC}
          options={[
            { label: "None", value: undefined },
            ...LIVE_FIT_SUMMER_CAPS_C.map(value => ({ label: `<= ${fmtTemp(value, temp)}`, value })),
          ]}
          onPick={v => setLiveNumber("maxSummerHighC", v)}
        />
        <ConstraintSelectRow
          id={`${liveControlBaseId}-winter-floor`}
          label="Winter floor"
          value={filters.minWinterLowC}
          options={[
            { label: "None", value: undefined },
            ...LIVE_FIT_WINTER_FLOORS_C.map(value => ({ label: `>= ${fmtTemp(value, temp)}`, value })),
          ]}
          onPick={v => setLiveNumber("minWinterLowC", v)}
        />
        <ConstraintSelectRow
          id={`${liveControlBaseId}-garden-floor`}
          label="Garden floor"
          value={filters.minGrowability}
          options={[
            { label: "None", value: undefined },
            ...LIVE_FIT_GROWABILITY_FLOORS.map(value => ({ label: `${value}+`, value })),
          ]}
          onPick={v => setLiveNumber("minGrowability", v)}
        />
        <RiskConstraintSelectRow
          id={`${liveControlBaseId}-fire-ceiling`}
          label="Fire ceiling"
          value={filters.maxFireRisk}
          onPick={v => setLiveRisk("maxFireRisk", v)}
        />
        <RiskConstraintSelectRow
          id={`${liveControlBaseId}-risk-ceiling`}
          label="Risk ceiling"
          value={filters.maxOverallRisk}
          onPick={v => setLiveRisk("maxOverallRisk", v)}
        />
      </div>
    </div>
  );
}

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
  hideClearAll = false,
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
  hideClearAll?: boolean;
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
    <section className="lens-receipt" aria-label="Current Explorer lens">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`${rankingLabel}. ${lensLine}`}
      </div>
      <div className="lens-receipt__head">
        <span className="lens-receipt__icon" aria-hidden>
          <Compass className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="lens-receipt__eyebrow">Current lens</div>
          <div className="lens-receipt__title">{rankingLabel}</div>
        </div>
        {hasAny && !hideClearAll ? (
          <button
            type="button"
            className="lens-receipt__clear"
            onClick={onClearAll}
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            Clear all
          </button>
        ) : null}
      </div>
      <p className="lens-receipt__line">{lensLine}</p>
      <div className="lens-receipt__chips" aria-label="Active lens signals">
        {chips.length > 0 ? (
          chips.slice(0, 7).map(chip => {
            const removeLabel = `Remove filter: ${chip.label}`;
            return chip.onDismiss ? (
              <button
                key={chip.key}
                type="button"
                className="lens-receipt__chip lens-receipt__chip--dismiss"
                data-tone={chip.tone}
                onClick={chip.onDismiss}
                aria-label={removeLabel}
                title={removeLabel}
              >
                {chip.label}
                <X className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
              </button>
            ) : (
              <span key={chip.key} className="lens-receipt__chip" data-tone={chip.tone}>
                {chip.label}
              </span>
            );
          })
        ) : (
          <span className="lens-receipt__chip" data-tone="glacier">
            Full atlas
          </span>
        )}
        {chips.length > 7 ? (
          <span
            className="lens-receipt__chip lens-receipt__chip--overflow"
            data-tone="glacier"
            title={chips.slice(7).map(chip => chip.label).join(", ")}
          >
            +{chips.length - 7} more
          </span>
        ) : null}
      </div>
    </section>
  );
}

function ConstraintSelectRow({
  id,
  label,
  value,
  options,
  onPick,
}: {
  id: string;
  label: string;
  value: number | undefined;
  options: { label: string; value: number | undefined }[];
  onPick: (value: number | undefined) => void;
}) {
  const selectedValue = value == null ? "" : String(value);
  return (
    <label htmlFor={id} className="live-select-row">
      <span className="live-select-row__label">{label}</span>
      <span className="live-select-row__select-wrap">
        <select
          id={id}
          value={selectedValue}
          aria-label={label}
          title={label}
          onChange={event => {
            const next = event.currentTarget.value;
            onPick(next === "" ? undefined : Number(next));
          }}
          className="live-select-row__select"
        >
          {options.map(opt => {
            return (
              <option
                key={`${label}-${opt.label}`}
                value={opt.value == null ? "" : String(opt.value)}
              >
                {opt.label}
              </option>
            );
          })}
        </select>
      </span>
    </label>
  );
}

function RiskConstraintSelectRow({
  id,
  label,
  value,
  onPick,
}: {
  id: string;
  label: string;
  value: RiskLevel | undefined;
  onPick: (value: RiskLevel | undefined) => void;
}) {
  const options: { label: string; value: RiskLevel | undefined }[] = [
    { label: "None", value: undefined },
    ...LIVE_FIT_RISK_CEILINGS.map(value => ({ label: RISK_LABELS[value], value })),
  ];
  return (
    <label htmlFor={id} className="live-select-row">
      <span className="live-select-row__label">{label}</span>
      <span className="live-select-row__select-wrap">
        <select
          id={id}
          value={value ?? ""}
          aria-label={label}
          title={label}
          onChange={event => {
            const next = event.currentTarget.value;
            onPick(next === "" ? undefined : (next as RiskLevel));
          }}
          className="live-select-row__select"
        >
          {options.map(opt => {
            return (
              <option
                key={`${label}-${opt.label}`}
                value={opt.value ?? ""}
              >
                {opt.label}
              </option>
            );
          })}
        </select>
      </span>
    </label>
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
