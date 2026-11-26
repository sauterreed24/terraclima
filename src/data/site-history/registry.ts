// ============================================================
// Site history, one file at a time.
// ============================================================
//
// The researched site-history overlays are about 1.4 MB of prose (≈500 KB
// gzip) across ten files. A profile needs one place's entry, so it downloads
// only the file that holds it (≈50 KB gzip). `loadSiteHistory` starts that
// download; `siteHistoryThenable` hands PlaceDetail a stable promise for
// React's `use`; `siteHistoryFor` reads what has arrived, synchronously, for
// the overview composer.
//
// Importing `places.site-history` (the full record, for tests and scripts)
// primes this cache with every entry, so those callers see what they always did.
// ============================================================

import type { SiteHistoryEntry } from "./types";
import { SITE_HISTORY_GROUP_BY_ID } from "./group-index";

export type SiteHistoryGroup =
  | "usa-1" | "usa-2" | "usa-3" | "usa-4" | "usa-5" | "usa-6"
  | "canada-1" | "canada-2" | "mexico-1" | "mexico-2";

type GroupRecord = Record<string, SiteHistoryEntry>;

const GROUP_LOADERS: Record<SiteHistoryGroup, () => Promise<GroupRecord>> = {
  "usa-1": () => import("./usa-1").then(m => m.SITE_HISTORY_USA_1),
  "usa-2": () => import("./usa-2").then(m => m.SITE_HISTORY_USA_2),
  "usa-3": () => import("./usa-3").then(m => m.SITE_HISTORY_USA_3),
  "usa-4": () => import("./usa-4").then(m => m.SITE_HISTORY_USA_4),
  "usa-5": () => import("./usa-5").then(m => m.SITE_HISTORY_USA_5),
  "usa-6": () => import("./usa-6").then(m => m.SITE_HISTORY_USA_6),
  "canada-1": () => import("./canada-1").then(m => m.SITE_HISTORY_CANADA_1),
  "canada-2": () => import("./canada-2").then(m => m.SITE_HISTORY_CANADA_2),
  "mexico-1": () => import("./mexico-1").then(m => m.SITE_HISTORY_MEXICO_1),
  "mexico-2": () => import("./mexico-2").then(m => m.SITE_HISTORY_MEXICO_2),
};

/** Entries that have arrived. `null`: the place has no site history (or its file failed to load). */
const entries = new Map<string, SiteHistoryEntry | null>();
const groupLoads = new Map<SiteHistoryGroup, Promise<void>>();

type Thenable = Promise<SiteHistoryEntry | null> & {
  status?: "pending" | "fulfilled" | "rejected";
  value?: SiteHistoryEntry | null;
};
const thenables = new Map<string, Thenable>();
/**
 * Places whose file failed to load. Their thenable stays fulfilled with null,
 * so re-renders of the open profile do not suspend and re-request (which
 * would loop); the next `loadSiteHistory` call — a new open — retries.
 */
const failed = new Set<string>();

function remember(record: GroupRecord): void {
  for (const [id, entry] of Object.entries(record)) entries.set(id, entry);
}

/** Put every entry of an already-loaded record in the cache (tests, scripts). */
export function primeSiteHistory(record: GroupRecord): void {
  remember(record);
  for (const id of Object.keys(record)) thenables.delete(id);
}

/** What has arrived for `id`: the entry, `null` (none), or `undefined` (not loaded yet). */
export function siteHistoryFor(id: string): SiteHistoryEntry | null | undefined {
  if (entries.has(id)) return entries.get(id) ?? null;
  return SITE_HISTORY_GROUP_BY_ID[id] ? undefined : null;
}

/**
 * Download the file holding `id`'s site history. Never rejects: offline or on
 * a failed download the profile renders without the overlay, and the next call
 * (a later open of the place) tries again.
 */
export function loadSiteHistory(id: string): Promise<SiteHistoryEntry | null> {
  // A fresh open of a place whose file failed earlier tries again.
  if (failed.delete(id)) thenables.delete(id);
  const known = siteHistoryFor(id);
  if (known !== undefined) return Promise.resolve(known);
  const group = SITE_HISTORY_GROUP_BY_ID[id]!;
  let load = groupLoads.get(group);
  if (!load) {
    load = GROUP_LOADERS[group]().then(remember, () => {
      groupLoads.delete(group);
    });
    groupLoads.set(group, load);
  }
  return load.then(() => {
    const entry = siteHistoryFor(id);
    return entry === undefined ? null : entry;
  });
}

/**
 * A promise for React's `use` that is the same object on every render of the
 * same place, and already marked fulfilled when the entry is cached, so a
 * profile whose file has arrived renders without suspending.
 */
export function siteHistoryThenable(id: string): Promise<SiteHistoryEntry | null> {
  let t = thenables.get(id);
  if (t) return t;
  const known = siteHistoryFor(id);
  if (known !== undefined) {
    t = Promise.resolve(known) as Thenable;
    t.status = "fulfilled";
    t.value = known;
  } else {
    const pending = loadSiteHistory(id) as Thenable;
    pending.status = "pending";
    pending.then(value => {
      pending.status = "fulfilled";
      pending.value = value;
      // A failed download resolves to null: the profile renders without the
      // overlay. Keep this thenable (re-renders must not retry); a later open does.
      if (siteHistoryFor(id) === undefined) failed.add(id);
    });
    t = pending;
  }
  thenables.set(id, t);
  return t;
}

/**
 * For a profile that rendered without its history because the download failed:
 * try once more. Resolves true when the entry has now arrived (the caller
 * re-renders); false when there was nothing to retry or it failed again.
 */
export async function retryFailedSiteHistory(id: string): Promise<boolean> {
  if (!failed.has(id)) return false;
  return (await loadSiteHistory(id)) != null;
}
