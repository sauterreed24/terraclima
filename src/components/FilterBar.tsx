import { memo } from "react";
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
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  ranking: RankingProfile;
  setRanking: (r: RankingProfile) => void;
}

export const FilterBar = memo(function FilterBar({ filters, setFilters, ranking, setRanking }: Props) {
  const toggleCountry = (c: Country) => {
    const ns = new Set(filters.countries);
    if (ns.has(c)) ns.delete(c); else ns.add(c);
    setFilters({ ...filters, countries: ns });
  };
  const toggleArchetype = (a: MicroclimateArchetype) => {
    const ns = new Set(filters.archetypes);
    if (ns.has(a)) ns.delete(a); else ns.add(a);
    setFilters({ ...filters, archetypes: ns });
  };

  const hasAny = filters.countries.size > 0 || filters.archetypes.size > 0 || (filters.search?.length ?? 0) > 0;
  const clearAll = () => setFilters({ countries: new Set(), archetypes: new Set(), search: "" });

  return (
    <div className="panel p-3 space-y-3">
      <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(13,20,32,0.7)] border border-[rgba(71,90,122,0.55)] focus-within:border-[rgba(140,200,224,0.6)] transition-colors">
        <Search className="w-3.5 h-3.5 text-stone shrink-0" aria-hidden />
        <input
          value={filters.search ?? ""}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search name, region, or archetype"
          className="bg-transparent text-sm text-ice placeholder:text-shadow outline-none flex-1 min-w-0"
        />
        {hasAny && (
          <button onClick={clearAll} className="text-stone hover:text-ice flex items-center gap-1 text-xs" title="Clear filters">
            <X className="w-3 h-3" />
          </button>
        )}
      </label>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Rank by</div>
        <div className="flex flex-wrap gap-1.5">
          {RANKING_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setRanking(opt.id)}
              className="chip chip-btn"
              data-tone={ranking === opt.id ? "glacier" : undefined}
              data-active={ranking === opt.id}
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
              onClick={() => toggleCountry(c)}
              className="chip chip-btn"
              data-tone={filters.countries.has(c) ? "ochre" : undefined}
              data-active={filters.countries.has(c)}
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
              onClick={() => toggleArchetype(a.id)}
              className="chip chip-btn"
              data-tone={filters.archetypes.has(a.id) ? a.tone : undefined}
              data-active={filters.archetypes.has(a.id)}
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
