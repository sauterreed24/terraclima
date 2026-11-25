import { useMemo } from "react";
import { searchPlaces, suggestPlaceSearches } from "../lib/place-search";
import type { Place } from "../types";

/**
 * "Did you mean" line for the Explorer search. Shows when the search only
 * found typo-tolerant matches, or found nothing. The hidden status line stays
 * mounted so screen readers hear the change; the buttons set the search text.
 */
export function SearchSuggestions({ query, pool, resultCount, onPick, className = "" }: {
  query: string;
  pool: readonly Place[];
  /** Places left in the list after search and every other filter. */
  resultCount: number;
  onPick: (text: string) => void;
  className?: string;
}) {
  const q = query.trim();
  const { lead, picks } = useMemo(() => {
    const close = q !== "" && searchPlaces(pool, q).mode === "fuzzy";
    if (!close && (q === "" || resultCount > 0)) return { lead: "", picks: [] as string[] };
    const picks = suggestPlaceSearches(q, pool, 3)
      .map(s => s.text)
      .filter(text => text.toLowerCase() !== q.toLowerCase());
    const lead = close && resultCount > 0
      ? `No exact match for “${q}”. Showing close matches.`
      : picks.length > 0 ? `No places match “${q}”.` : "";
    return { lead, picks };
  }, [q, pool, resultCount]);

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {lead ? `${lead}${picks.length > 0 ? ` Did you mean ${picks.join(", ")}?` : ""}` : ""}
      </p>
      {lead ? (
        <div
          role="group"
          aria-label="Search suggestions"
          data-search-suggestions
          className={`flex flex-wrap items-center gap-2 text-xs text-stone-readable ${className}`}
        >
          <span aria-hidden="true">{lead}</span>
          {picks.map(text => (
            <button
              key={text}
              type="button"
              className="btn-ghost !text-xs !py-1.5 min-h-11 lg:min-h-0"
              onClick={() => onPick(text)}
            >
              Did you mean {text}?
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
