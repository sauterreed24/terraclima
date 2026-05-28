import { Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { writeClipboardText } from "../../lib/clipboard";

type CopyStatus = "idle" | "copied" | "failed";

const RESET_MS = 2000;

export function CopyPlaceLink({ placeId }: { placeId: string }) {
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
    const ok = await writeClipboardText(u.toString());
    if (resetTimerRef.current != null) {
      clearTimeout(resetTimerRef.current);
    }
    setStatus(ok ? "copied" : "failed");
    resetTimerRef.current = setTimeout(() => {
      setStatus("idle");
      resetTimerRef.current = null;
    }, RESET_MS);
  }, [placeId]);

  const label =
    status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy link";

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="btn-ghost !text-xs"
      title="Copy URL to this place"
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
