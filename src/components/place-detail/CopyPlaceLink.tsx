import { Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { shareUrl } from "../../lib/share";

type CopyStatus = "idle" | "copied" | "failed";

const RESET_MS = 2000;

export function CopyPlaceLink({ placeId, placeName }: { placeId: string; placeName: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current != null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const onCopy = useCallback(async () => {
    const u = new URL(window.location.href);
    u.searchParams.set("p", placeId);
    const hash = window.location.hash;
    if (hash.startsWith("#deep-")) {
      u.hash = hash;
    }
    const outcome = await shareUrl({
      url: u.toString(),
      title: placeName,
      text: `Terraclima — ${placeName}`,
    });
    if (resetTimerRef.current != null) {
      clearTimeout(resetTimerRef.current);
    }
    setStatus(outcome === "failed" ? "failed" : "copied");
    resetTimerRef.current = setTimeout(() => {
      setStatus("idle");
      resetTimerRef.current = null;
    }, RESET_MS);
  }, [placeId, placeName]);

  const label =
    status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy link";

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="btn-ghost !text-xs"
      title="Copy or share URL to this place"
      aria-label={
        status === "copied"
          ? "Copied link to this place"
          : status === "failed"
            ? "Copy link failed"
            : "Copy link to this place"
      }
    >
      <Link2 className="w-3 h-3" aria-hidden />
      <span aria-live="polite">{label}</span>
    </button>
  );
}
