// ============================================================
// Profile-only place fields, one small file at a time.
// ============================================================
//
// Sources, confidence notes, the climate-change outlook and In depth chapters
// (≈105 KB gzip for all places) are not needed to draw the atlas list or map.
// They load per group of ≈23 places when a profile opens, and for every group
// once the page is idle. Compare and exports need only counts (profile-stats). `profileExtrasThenable` gives React's `use` a stable
// promise; `withProfileExtras` returns the place with its fields once they
// have arrived (or the place unchanged when they have not, or it already has
// them, as test fixtures do).
//
// Importing `places.full` (tests, scripts) primes every group.
// ============================================================

import type { Place } from "../../types";
import { addDeferredSearchProse } from "../places";
import { SITE_HISTORY_GROUP_BY_ID } from "../site-history/group-index";
import type { SiteHistoryGroup } from "../site-history/registry";
import type { ProfileFields } from "../../lib/profile-stats-compute";

type Group = SiteHistoryGroup;
type GroupData = Record<string, ProfileFields>;

// One generated file per site-history group (≈23 places, 8–16 KB gzip):
// `npm run corpus:profile-stats` writes them from the authored sources.
const GROUP_LOADERS: Record<Group, () => Promise<GroupData>> = {
  "usa-1": () => import("./generated/usa-1.json").then(m => m.default as GroupData),
  "usa-2": () => import("./generated/usa-2.json").then(m => m.default as GroupData),
  "usa-3": () => import("./generated/usa-3.json").then(m => m.default as GroupData),
  "usa-4": () => import("./generated/usa-4.json").then(m => m.default as GroupData),
  "usa-5": () => import("./generated/usa-5.json").then(m => m.default as GroupData),
  "usa-6": () => import("./generated/usa-6.json").then(m => m.default as GroupData),
  "canada-1": () => import("./generated/canada-1.json").then(m => m.default as GroupData),
  "canada-2": () => import("./generated/canada-2.json").then(m => m.default as GroupData),
  "mexico-1": () => import("./generated/mexico-1.json").then(m => m.default as GroupData),
  "mexico-2": () => import("./generated/mexico-2.json").then(m => m.default as GroupData),
};
const ALL_GROUPS = Object.keys(GROUP_LOADERS) as Group[];
const groupOf = (place: Pick<Place, "id">): Group | undefined => SITE_HISTORY_GROUP_BY_ID[place.id];

const loaded = new Map<Group, GroupData>();
const loads = new Map<Group, Promise<boolean>>();
const merged = new WeakMap<Place, Place>();

type Thenable = Promise<boolean> & { status?: "pending" | "fulfilled"; value?: boolean };
const thenables = new Map<Group, Thenable>();
/** Groups whose download failed; their settled thenable is kept until a new open retries. */
const failed = new Set<Group>();

const hasFields = (place: Place) => place.citations !== undefined;

/** Hand a loaded group's In depth chapter text to search, as it was before the split. */
function indexChapters(data: GroupData): void {
  for (const [id, fields] of Object.entries(data)) {
    addDeferredSearchProse(id, (fields.deepSections ?? []).map(sec => `${sec.title} ${sec.paragraphs.join(" ")}`));
  }
}

/** Put every place's finished fields in the cache (tests, scripts via `places.full`). */
export function primeProfileExtras(fieldsById: Record<string, ProfileFields>): void {
  for (const group of ALL_GROUPS) {
    const data: GroupData = {};
    for (const [id, fields] of Object.entries(fieldsById)) if (SITE_HISTORY_GROUP_BY_ID[id] === group) data[id] = fields;
    loaded.set(group, data);
    indexChapters(data);
    thenables.delete(group);
    failed.delete(group);
  }
}

/** The place with its profile-only fields if they have arrived; otherwise the place as given. */
export function withProfileExtras(place: Place): Place {
  if (hasFields(place)) return place;
  const group = groupOf(place);
  const fields = group ? loaded.get(group)?.[place.id] : undefined;
  if (!fields) return place;
  let out = merged.get(place);
  if (!out) {
    out = { ...place, ...fields };
    merged.set(place, out);
  }
  return out;
}

/**
 * Download the group file for `place`. Resolves true once its fields are
 * available, false when the download failed (never rejects). A call after a
 * failure — a new open of the profile — tries again.
 */
export function loadProfileExtras(place: Pick<Place, "id">): Promise<boolean> {
  const group = groupOf(place);
  if (!group) return Promise.resolve(false);
  if (failed.delete(group)) thenables.delete(group);
  if (loaded.has(group)) return Promise.resolve(true);
  let load = loads.get(group);
  if (!load) {
    load = GROUP_LOADERS[group]().then(
      data => {
        loaded.set(group, data);
        indexChapters(data);
        return true;
      },
      () => {
        loads.delete(group);
        return false;
      },
    );
    loads.set(group, load);
  }
  return load;
}

/** Same as `loadProfileExtras` for several places; each group file is fetched once. */
export async function loadProfileExtrasFor(places: readonly Pick<Place, "id">[]): Promise<boolean> {
  const firstOfGroup = new Map<Group, Pick<Place, "id">>();
  for (const p of places) { const g = groupOf(p); if (g && !firstOfGroup.has(g)) firstOfGroup.set(g, p); }
  const results = await Promise.all([...firstOfGroup.values()].map(loadProfileExtras));
  return results.every(Boolean);
}

/**
 * A promise for React's `use` that is the same object on every render, and
 * already fulfilled when the file is cached (or the place carries its fields),
 * so an open profile does not suspend again.
 */
export function profileExtrasThenable(place: Place): Promise<boolean> {
  const group = groupOf(place);
  if (!group || hasFields(place) || loaded.has(group)) {
    const done = Promise.resolve(true) as Thenable;
    done.status = "fulfilled";
    done.value = true;
    return done;
  }
  const existing = thenables.get(group);
  if (existing) return existing;
  const pending = loadProfileExtras(place) as Thenable;
  pending.status = "pending";
  void pending.then(ok => {
    pending.status = "fulfilled";
    pending.value = ok;
    // Keep a failed thenable: re-renders show the profile without these
    // fields instead of suspending and re-requesting in a loop.
    if (!ok) failed.add(group);
  });
  thenables.set(group, pending);
  return pending;
}

/** For a view that rendered without the fields because the download failed: try once more. */
export async function retryFailedProfileExtras(place: Place): Promise<boolean> {
  const group = groupOf(place);
  if (!group || !failed.has(group)) return false;
  return loadProfileExtras(place);
}
