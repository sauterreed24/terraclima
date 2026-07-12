import { memo } from "react";
import { Search } from "lucide-react";
import { PLACE_COUNTS } from "../../data/places";
import { buildExplorerRecoveryActions } from "../../lib/explorer-recovery";
import { hasNonSearchExplorerFilters, type FilterState } from "../../lib/scoring";

export const EmptyResults = memo(function EmptyResults({
  filters,
  onClearAll,
  onClearSearch,
  onRelaxLiveFinder,
  onClearGeography,
  searchTerm,
}: {
  filters: FilterState;
  onClearAll: () => void;
  onClearSearch: () => void;
  onRelaxLiveFinder: () => void;
  onClearGeography: () => void;
  searchTerm: string;
}) {
  // Tailor the message to what is actually narrowing the set so the guidance
  // points at the right control instead of always blaming "filters".
  const hasOtherFilters = hasNonSearchExplorerFilters(filters);
  const searchOnly = searchTerm.length > 0 && !hasOtherFilters;
  const filtersOnly = searchTerm.length === 0 && hasOtherFilters;

  const heading = searchOnly
    ? `No places match “${searchTerm}”`
    : filtersOnly
      ? "Nothing matches those filters at once"
      : "Nothing matches that search and those filters";

  const body = searchOnly
    ? "Try a shorter or different term — names, regions, archetypes, and Köppen codes all match, and accents are forgiving (“san jose” finds San José)."
    : filtersOnly
      ? "That's a tight intersection — try loosening one. Drop a country, drop one of the archetypes, or relax a Live-Finder limit."
      : "That's a tight combination — try shortening the search or loosening one filter. Names, regions, archetypes, and Köppen codes all match.";
  const recoveryActions = buildExplorerRecoveryActions({
    filters,
    searchTerm,
    onClearSearch,
    onRelaxLiveFinder,
    onClearGeography,
    onClearAll,
  });

  return (
    <div className="col-span-full panel-warm tc-empty-results p-6 sm:p-7 text-center anim-fade-in">
      <div className="tc-empty-results__icon">
        <Search className="w-4 h-4 tc-icon-ochre" aria-hidden />
      </div>
      <h3 className="font-atlas text-lg text-ice mb-1">{heading}</h3>
      <p className="text-sm text-frost mb-2 max-w-md mx-auto">{body}</p>
      <p className="text-xs text-stone mb-4 max-w-md mx-auto">
        Nothing is broken: the atlas still holds <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> curated stops behind the filters.
      </p>
      <div className="tc-empty-results__recovery" role="group" aria-label="Ways to recover matching places">
        <div className="tc-empty-results__recovery-head">
          <span>Try next</span>
          <p>Loosen one part of the screen instead of losing the whole scouting context.</p>
        </div>
        <div className="tc-empty-results__actions">
          {recoveryActions.map(action => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="tc-empty-results__action"
              data-primary={action.primary || undefined}
            >
              <span>{action.label}</span>
              <small>{action.detail}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
