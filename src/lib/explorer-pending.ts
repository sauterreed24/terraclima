import type { FilterState } from "./scoring";

/** True while live filter controls and deferred map/grid results disagree, or while
 *  a future-climate projection is still in flight. */
export function explorerResultsPending(
  filters: FilterState,
  deferredFilters: FilterState,
  projecting: boolean,
): boolean {
  return deferredFilters !== filters || projecting;
}
