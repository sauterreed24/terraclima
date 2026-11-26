import { useEffect, useRef, useState } from "react";
import { BookmarkCheck, X } from "lucide-react";
import { PLACES_BY_ID, resolvePlaceId } from "../../data/places";
import { BOOKMARKS_STORAGE_KEY, loadBookmarks } from "../../lib/place-bookmarks";
import { readSharedSavedIds, withoutSavedParam } from "../../lib/shared-saved-places";
import { importSavedIds } from "../../lib/saved-places-import";

interface Props {
  /** The address's query string as the app opened (it may since have been rewritten). */
  search: string;
  /** Called with "" when the prompt is finished. */
  onDone: (next: "") => void;
}

/**
 * Shown when the atlas opens from a "Link to these places" link: lists the
 * places and asks before adding them. Nothing is saved unless the reader agrees,
 * and the parameter leaves the address either way.
 */
export default function SharedSavedPlacesPrompt({ search, onDone }: Props) {
  const [ids] = useState(() => readSharedSavedIds(search, resolvePlaceId));
  const [saved] = useState(() => new Set(loadBookmarks().map(id => resolvePlaceId(id) ?? id)));
  const [message, setMessage] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // Once, when the prompt appears: tidy the address and move focus to it.
  useEffect(() => {
    if (window.location.search.includes("saved=")) {
      window.history.replaceState(window.history.state, "", withoutSavedParam(window.location.href));
    }
    if (ids.length === 0) onDoneRef.current("");
    else headingRef.current?.focus({ preventScroll: false });
  }, [ids]);
  if (ids.length === 0) return null;
  const fresh = ids.filter(id => !saved.has(id));
  const names = ids.map(id => PLACES_BY_ID[id]?.name).filter(Boolean) as string[];
  const shown = names.slice(0, 6).join(", ") + (names.length > 6 ? `, and ${names.length - 6} more` : "");
  return (
    <section className="tc-shared-saved panel-warm mx-3 sm:mx-6 mt-3 px-4 py-3 rounded-xl" aria-labelledby="tc-shared-saved-title">
      <h2 id="tc-shared-saved-title" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-frost outline-none">
        This link carries {ids.length} saved place{ids.length === 1 ? "" : "s"}
      </h2>
      <p className="text-sm text-stone-readable mt-1">{shown}.</p>
      <p className="text-xs text-stone-readable mt-1" role="status" aria-live="polite">
        {message ?? (fresh.length === 0
          ? "All of them are already in your saved places."
          : `${fresh.length} ${fresh.length === 1 ? "is" : "are"} not in your saved places yet. Adding them keeps everything you have saved.`)}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {fresh.length > 0 && message == null ? (
          <button
            type="button"
            className="btn-primary !text-xs !py-1.5"
            onClick={() => {
              setMessage(importSavedIds(fresh, resolvePlaceId).message);
              // The app's saved-places listener refreshes from storage.
              window.dispatchEvent(new StorageEvent("storage", { key: BOOKMARKS_STORAGE_KEY }));
            }}
          >
            <BookmarkCheck className="w-3.5 h-3.5" aria-hidden /> Add {fresh.length} place{fresh.length === 1 ? "" : "s"}
          </button>
        ) : null}
        <button type="button" className="btn-ghost !text-xs !py-1.5" onClick={() => onDone("")}>
          <X className="w-3.5 h-3.5" aria-hidden /> {fresh.length > 0 && message == null ? "Not now" : "Close"}
        </button>
      </div>
    </section>
  );
}
