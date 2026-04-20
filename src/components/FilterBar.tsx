import { memo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { Country, MicroclimateArchetype } from "../types";
import type { FilterState } from "../lib/scoring";
import { ARCHETYPES } from "../data/archetypes";
import type { RankingProfile } from "../lib/scoring";
import { Search, X } from "lucide-react";

export const RANKING_OPTIONS: { id: RankingProfile; label: string }[] = [
  { id: "hidden-gems", label: "Hidden gems" },
  { id: "most-unique", label: "Most unique" },
  { id: "coolest-summers", label: "Coolest summers" },
  { id: "mildest-winters", label: "Mildest winters" },
  { id: "best-shoulder-seasons", label: "Best shoulder seasons" },
  { id: "driest-air", label: "Driest air" },
  { id: "best-growability", label: "Best growability" },
  { id: "lowest-fire-risk", label: "Lowest fire risk" },
  { id: "climate-resilient", label: "Climate-resilient" },
  { id: "best-four-season", label: "Best four-season" },
  { id: "best-diurnal-sleep", label: "Best diurnal / sleep climate" },
  { id: "mediterranean-like", label: "Mediterranean-like" },
  { id: "wet-forest-refuges", label: "Wet-forest refuges" },
  { id: "monsoon-drama", label: "Monsoon drama" },
];

interface Props {
  searchInputId?: string;
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  ranking: RankingProfile;
  setRanking: (r: RankingProfile) => void;
}

export const FilterBar = memo(function FilterBar({ searchInputId, filters, setFilters, ranking, setRanking }: Props) {
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

  const hasAny = filters.countries.size > 0 || filters.archetypes.size > 0 || (filters.search?.length ?? 0) > 0;
  const clearAll = useCallback(() => setFilters({ countries: new Set(), archetypes: new Set(), search: "" }), [setFilters]);

  return (
    <div className="panel contour-bg p-3 space-y-3">
      <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/90 border border-[rgba(210,180,150,0.4)] focus-within:border-[rgba(26,143,168,0.55)] focus-within:ring-2 focus-within:ring-[rgba(94,196,220,0.25)] transition-[border-color,box-shadow] min-h-[2.75rem]">
        <Search className="w-4 h-4 text-stone shrink-0" aria-hidden />
        <input
          id={searchInputId}
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

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Rank by</div>
        <div className="flex flex-wrap gap-1.5">
          {RANKING_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRanking(opt.id)}
              className="chip chip-btn"
              data-tone={ranking === opt.id ? "glacier" : undefined}
              data-active={ranking === opt.id}
              aria-pressed={ranking === opt.id}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Country</div>
        <div className="flex flex-wrap gap-1.5">
          {(["USA", "Mexico", "Canada"] as Country[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCountry(c)}
              className="chip chip-btn"
              data-tone={filters.countries.has(c) ? "ochre" : undefined}
              data-active={filters.countries.has(c)}
              aria-pressed={filters.countries.has(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5 flex items-center justify-between">
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
        <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
          {ARCHETYPES.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleArchetype(a.id)}
              className="chip chip-btn"
              data-tone={filters.archetypes.has(a.id) ? a.tone : undefined}
              data-active={filters.archetypes.has(a.id)}
              aria-pressed={filters.archetypes.has(a.id)}
              title={a.blurb}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
