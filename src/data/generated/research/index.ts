/* Research provenance runtime exports.
 * Compact citation overlay is eager-safe; full receipts are lazy.
 */
import type { Citation } from "../../../types";
import type { PlaceResearchReceipt } from "../../../lib/research/contracts";
import citationsOverlay from "./citations-overlay.json";

export const RESEARCH_CITATIONS_BY_ID: Record<string, Citation[]> =
  (citationsOverlay as { byId: Record<string, Citation[]> }).byId;

let _receiptsById: Record<string, PlaceResearchReceipt> | null = null;

/** Lazy full research receipts for Evidence & Methods. */
export async function loadResearchReceipts(): Promise<Record<string, PlaceResearchReceipt>> {
  if (_receiptsById) return _receiptsById;
  const mod = await import("./receipts.json");
  const bundle = (mod.default ?? mod) as { receipts: PlaceResearchReceipt[] };
  _receiptsById = Object.fromEntries(bundle.receipts.map(r => [r.placeId, r]));
  return _receiptsById;
}

export function getResearchReceipt(placeId: string): PlaceResearchReceipt | undefined {
  return _receiptsById?.[placeId];
}
