/* Research provenance runtime exports: full receipts load lazily.
 * The citation projection (citations-overlay.json) is merged into each place's
 * sources by `npm run corpus:profile-stats` (src/data/places.full.ts), and
 * ships with the profile fields, not from here.
 */
import type { PlaceResearchReceipt } from "../../../lib/research/contracts";

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
