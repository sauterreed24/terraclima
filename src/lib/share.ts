/**
 * Native-share wrapper with a clipboard fallback.
 *
 * On mobile + modern macOS Safari, `navigator.share` shows the OS share
 * sheet (Messages, AirDrop, Mail, every install-share-target PWA). On
 * older browsers and on the desktop where `navigator.share` is missing
 * or returns false, we fall back to writeClipboardText so the user still
 * gets a copy of the URL.
 *
 * Returns the surface that handled the share so callers can show the
 * right confirmation toast.
 */
import { writeClipboardText } from "./clipboard";

export type ShareOutcome = "shared" | "dismissed" | "copied" | "failed";

export interface SharePayload {
  /** Required; usually the place name or "Terraclima". */
  title: string;
  /** Optional one-line description for the share-sheet preview. */
  text?: string;
  /** Absolute URL the share-sheet should propagate. */
  url: string;
}

interface ShareCapableNavigator {
  share?: (data: SharePayload) => Promise<void>;
  canShare?: (data: SharePayload) => boolean;
}

function getShareNavigator(): ShareCapableNavigator | null {
  if (typeof navigator === "undefined") return null;
  return navigator as unknown as ShareCapableNavigator;
}

/**
 * Open the OS share sheet for the given payload. Returns:
 *  - `"shared"` if the native share completed successfully,
 *  - `"dismissed"` if the user closed the native share sheet,
 *  - `"copied"` if we silently fell back to clipboard and that worked,
 *  - `"failed"` if both paths failed.
 *
 * A user-cancelled native share (AbortError) is not a failure and should not
 * produce copy-success feedback, because nothing was copied.
 */
export async function shareUrl(payload: SharePayload): Promise<ShareOutcome> {
  const nav = getShareNavigator();
  if (nav?.share) {
    // Check canShare when available so we don't trip into the catch path
    // for payloads the browser refuses (e.g. cross-origin url).
    if (!nav.canShare || nav.canShare(payload)) {
      try {
        await nav.share(payload);
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User dismissed the share sheet; don't fall back to clipboard.
          return "dismissed";
        }
        // All other failures: fall through to clipboard.
      }
    }
  }
  const ok = await writeClipboardText(payload.url);
  return ok ? "copied" : "failed";
}
