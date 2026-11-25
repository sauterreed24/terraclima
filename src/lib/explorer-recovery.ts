/**
 * Shared zero-result recovery actions for the Explorer hero strip and grid empty state.
 */
import { countLiveFinderConstraintSignals } from "./lifestyle-bundles";
import {
  hasNonSearchExplorerFilters,
  type FilterState,
} from "./scoring";

export type ExplorerRecoveryAction = {
  key: string;
  label: string;
  detail: string;
  onClick: () => void;
  primary?: boolean;
};

export function buildExplorerRecoveryActions({
  filters,
  searchTerm,
  onClearSearch,
  onRelaxLiveFinder,
  onClearGeography,
  onClearAll,
}: {
  filters: FilterState;
  searchTerm: string;
  onClearSearch: () => void;
  onRelaxLiveFinder: () => void;
  onClearGeography: () => void;
  onClearAll: () => void;
}): ExplorerRecoveryAction[] {
  const liveSignalCount = countLiveFinderConstraintSignals(filters);
  const geographyCount = filters.countries.size + filters.archetypes.size;
  const hasOtherFilters = hasNonSearchExplorerFilters(filters);
  const searchOnly = searchTerm.length > 0 && !hasOtherFilters;
  const filtersOnly = searchTerm.length === 0 && hasOtherFilters;
  const recoveryActions: ExplorerRecoveryAction[] = [];

  if (searchTerm.length > 0) {
    recoveryActions.push({
      key: "search",
      label: "Clear search",
      detail: `Remove “${searchTerm}” and keep your filters.`,
      onClick: onClearSearch,
      primary: searchOnly,
    });
  }
  if (liveSignalCount > 0) {
    recoveryActions.push({
      key: "live",
      label: "Clear must-haves",
      detail: `Remove ${liveSignalCount} must-have${liveSignalCount === 1 ? "" : "s"} or limit${liveSignalCount === 1 ? "" : "s"}. Search, country and climate type stay.`,
      onClick: onRelaxLiveFinder,
      primary: filtersOnly && geographyCount === 0,
    });
  }
  if (geographyCount > 0) {
    recoveryActions.push({
      key: "geography",
      label: "Clear country / climate type",
      detail: `Remove ${geographyCount} country or climate-type filter${geographyCount === 1 ? "" : "s"}. Search and must-haves stay.`,
      onClick: onClearGeography,
      primary: filtersOnly && liveSignalCount === 0,
    });
  }
  recoveryActions.push({
    key: "all",
    label: "Reset the atlas",
    detail: "Clear the search and every filter and show all places.",
    onClick: onClearAll,
    primary: !recoveryActions.some(action => action.primary),
  });
  return recoveryActions;
}
