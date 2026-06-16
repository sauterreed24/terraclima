import { Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { shareUrl } from "../../lib/share";

type CopyStatus = "idle" | "shared" | "copied" | "failed";

const RESET_MS = 2000;

export function CopyPlaceLink({ placeId, placeName }: { placeId: string; placeName: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current != null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "failed" || !fallbackUrl) return;
    const focusTimer = window.setTimeout(() => {
      const input = fallbackInputRef.current;
      input?.focus({ preventScroll: true });
      input?.select();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [fallbackUrl, status]);

  const onCopy = useCallback(async () => {
    const u = new URL(window.location.href);
    u.searchParams.set("p", placeId);
    const hash = window.location.hash;
    if (hash.startsWith("#deep-")) {
      u.hash = hash;
    }
    const sharePayloadUrl = u.toString();
    if (resetTimerRef.current != null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setStatus("idle");
    setFallbackUrl(null);
    const outcome = await shareUrl({
      url: sharePayloadUrl,
      title: placeName,
      text: `Terraclima: ${placeName}`,
    });
    if (outcome === "dismissed") {
      setStatus("idle");
      setFallbackUrl(null);
      resetTimerRef.current = null;
      return;
    }
    setStatus(outcome);
    if (outcome === "failed") {
      setFallbackUrl(sharePayloadUrl);
      resetTimerRef.current = null;
      return;
    }
    setFallbackUrl(null);
    resetTimerRef.current = setTimeout(() => {
      setStatus("idle");
      setFallbackUrl(null);
      resetTimerRef.current = null;
    }, RESET_MS);
  }, [placeId, placeName]);

  const label =
    status === "shared" ? "Shared" : status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy link";
  const buttonLabel =
    status === "shared"
      ? "Shared link to this place"
      : status === "copied"
        ? "Copied link to this place"
        : status === "failed"
          ? "Copy link failed"
          : "Copy or share link to this place";

  return (
    <>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="btn-ghost !text-xs"
        title={buttonLabel}
        aria-label={buttonLabel}
      >
        <Link2 className="w-3 h-3" aria-hidden />
        <span aria-live="polite">{label}</span>
      </button>
      {status === "failed" && fallbackUrl ? (
        <div className="tc-share-fallback copy-place-link__fallback" role="group" aria-label="Manual place share link">
          <span className="tc-share-fallback__label">Shareable link</span>
          <input
            ref={fallbackInputRef}
            type="text"
            readOnly
            value={fallbackUrl}
            className="tc-share-fallback__input"
            aria-label="Shareable place URL for manual copy"
            onFocus={event => event.currentTarget.select()}
            onClick={event => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </>
  );
}
