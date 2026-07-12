import { useCallback, useEffect, useRef, useState } from "react";
import type { ShareStatus } from "../lib/app-constants";
import { shareUrl } from "../lib/share";

/**
 * Share / copy status for Explorer view-link controls.
 * Owns transient feedback timing without duplicating URL formatting.
 */
export function useShareStatus() {
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);
  const shareResetRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (shareResetRef.current !== null) window.clearTimeout(shareResetRef.current);
  }, []);

  const resetShareStatus = useCallback(() => {
    if (shareResetRef.current !== null) {
      window.clearTimeout(shareResetRef.current);
      shareResetRef.current = null;
    }
    setShareStatus("idle");
    setShareFallbackUrl(null);
  }, []);

  const copyCurrentView = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sharePayloadUrl = url.toString();
    resetShareStatus();
    void shareUrl({
      title: document.title || "Terraclima",
      text: "Terraclima view",
      url: sharePayloadUrl,
    }).then(outcome => {
      if (outcome === "dismissed") {
        resetShareStatus();
        return;
      }
      setShareStatus(outcome);
      if (outcome === "failed") {
        setShareFallbackUrl(sharePayloadUrl);
        return;
      }
      setShareFallbackUrl(null);
      shareResetRef.current = window.setTimeout(() => {
        setShareStatus("idle");
        setShareFallbackUrl(null);
        shareResetRef.current = null;
      }, 2200);
    });
  }, [resetShareStatus]);

  return { shareStatus, shareFallbackUrl, copyCurrentView, resetShareStatus };
}
