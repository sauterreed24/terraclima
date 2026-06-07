import { memo, useCallback, type MouseEvent } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface Props {
  /** Whether this place is currently pinned. */
  pinned: boolean;
  /** Place display name — used to build accessible labels. */
  placeName: string;
  /** Toggle callback. Receives the synthetic event so callers can stopPropagation. */
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Size variant. `compact` is the small in-card chip; `header` is the prominent toolbar version. */
  size?: "compact" | "header";
  /** Optional label suffix when the same place has more than one visible pin control. */
  ariaContext?: string;
  className?: string;
}

/**
 * Bookmark/pin toggle. A single source of truth for the pin affordance —
 * used by PlaceCard, PlaceDetail header, and the (future) command palette.
 * Visual state encodes "pinned" through the filled icon + ochre tint so it
 * reads as "saved" without relying on colour alone (the icon swap is the
 * primary cue, the tint is reinforcement).
 */
export const BookmarkButton = memo(function BookmarkButton({
  pinned,
  placeName,
  onToggle,
  size = "compact",
  ariaContext,
  className,
}: Props) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onToggle(e);
    },
    [onToggle],
  );

  const Icon = pinned ? BookmarkCheck : Bookmark;
  const context = ariaContext ? ` ${ariaContext}` : "";
  const ariaLabel = pinned ? `Unpin ${placeName}${context}` : `Pin ${placeName} to your shortlist${context}`;
  const title = pinned ? "Remove from your shortlist" : "Save to your shortlist";

  if (size === "header") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`btn-ghost !text-xs tc-bookmark-btn ${pinned ? "tc-bookmark-btn--pinned" : ""} ${className ?? ""}`}
        aria-label={ariaLabel}
        aria-pressed={pinned}
        title={title}
      >
        <Icon className="w-3 h-3" aria-hidden />
        <span>{pinned ? "Pinned" : "Pin"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`tc-bookmark-chip ${pinned ? "tc-bookmark-chip--pinned" : ""} ${className ?? ""}`}
      aria-label={ariaLabel}
      aria-pressed={pinned}
      title={title}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
});
