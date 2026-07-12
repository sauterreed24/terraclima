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
      detail: `Remove “${searchTerm}” and keep the climate-fit filters intact.`,
      onClick: onClearSearch,
      primary: searchOnly,
    });
  }
  if (liveSignalCount > 0) {
    recoveryActions.push({
      key: "live",
      label: "Relax Live Finder",
      detail: `Drop ${liveSignalCount} comfort, risk, or growability limit${liveSignalCount === 1 ? "" : "s"} while keeping search and geography.`,
      onClick: onRelaxLiveFinder,
      primary: filtersOnly && geographyCount === 0,
    });
  }
  if (geographyCount > 0) {
    recoveryActions.push({
      key: "geography",
      label: "Clear region / terrain",
      detail: `Drop ${geographyCount} region or terrain filter${geographyCount === 1 ? "" : "s"} while keeping search and Live Finder signals.`,
      onClick: onClearGeography,
      primary: filtersOnly && liveSignalCount === 0,
    });
  }
  recoveryActions.push({
    key: "all",
    label: "Reset Explorer",
    detail: "Return to the full atlas and restart the fit search.",
    onClick: onClearAll,
    primary: !recoveryActions.some(action => action.primary),
  });
  return recoveryActions;
}
