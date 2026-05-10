import { memo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { Country, MicroclimateArchetype, RiskLevel } from "../types";
import type { FilterState } from "../lib/scoring";
import { ARCHETYPES } from "../data/archetypes";
import type { RankingProfile } from "../lib/scoring";
import { RANKING_OPTIONS } from "../lib/ranking-options";
import { LIVE_FIT_PRESETS, type LiveFitPresetId } from "../lib/live-fit";
import { Check, Search, X } from "lucide-react";
import { useProse } from "../lib/units";

export { RANKING_OPTIONS } from "../lib/ranking-options";

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
  const searchFieldId = searchInputId ?? "tc-atlas-filter-search";
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
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/90 border border-[rgba(210,180,150,0.4)] focus-within:border-[rgba(26,143,168,0.55)] focus-within:ring-2 focus-within:ring-[rgba(94,196,220,0.25)] transition-[border-color,box-shadow] min-h-[2.75rem]"
      >
        <Search className="w-4 h-4 text-stone shrink-0" aria-hidden />
        <input
          id={searchFieldId}
          value={filters.search ?? ""}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search name, region, or archetype"
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
            className="text-stone hover:text-ice flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-[rgba(94,196,220,0.1)] -mr-1"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </label>

      <div className="rounded-xl border border-[rgba(26,143,168,0.2)] bg-[rgba(232,248,251,0.42)] p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-readable">Live Finder</div>
            <div className="text-[11px] text-stone-readable leading-snug">Pick the life you are scouting for; cards explain fit and tradeoffs.</div>
          </div>
          {(filters.fitPresets?.size ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => setFilters({ ...filters, fitPresets: new Set() })}
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
              { label: "<= 22C", value: 22 },
              { label: "<= 26C", value: 26 },
            ]}
            onPick={v => setLiveNumber("maxSummerHighC", v)}
          />
          <ConstraintRow
            label="Winter floor"
            value={filters.minWinterLowC}
            options={[
              { label: "None", value: undefined },
              { label: ">= -5C", value: -5 },
              { label: ">= 0C", value: 0 },
            ]}
            onPick={v => setLiveNumber("minWinterLowC", v)}
          />
          <ConstraintRow
            label="Garden floor"
            value={filters.minGrowability}
            options={[
              { label: "None", value: undefined },
              { label: "65+", value: 65 },
              { label: "75+", value: 75 },
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
              onClick={() => setFilters({ ...filters, archetypes: new Set() })}
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
    { label: "Low", value: "low" },
    { label: "Moderate", value: "moderate" },
    { label: "Elevated", value: "elevated" },
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
