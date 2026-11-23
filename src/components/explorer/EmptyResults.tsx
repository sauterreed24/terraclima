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
    ? "Try a shorter or different term. Search matches place names, regions, climate types and Köppen codes (such as Csb), and ignores accents (“san jose” finds San José)."
    : filtersOnly
      ? "No place meets all of these at once. Remove a country or a climate type, or loosen one must-have."
      : "No place meets the search and the filters together. Shorten the search or loosen one filter. Search matches names, regions, climate types and Köppen codes.";
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
        The atlas has <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> places; the current settings hide all of them.
      </p>
      <div className="tc-empty-results__recovery" role="group" aria-label="Ways to bring places back">
        <div className="tc-empty-results__recovery-head">
          <span>Try next</span>
          <p>Loosen one thing at a time and keep the rest of your settings.</p>
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
