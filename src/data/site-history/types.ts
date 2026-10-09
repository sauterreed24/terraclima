/** Research-backed site history and Overview portrait overlays. */
export type SiteSeasonKey = "winter" | "spring" | "summer" | "autumn";

export interface SiteHistoryEntry {
  /**
   * Overview “Why it feels different” essay. Used when present; otherwise
   * `Place.whyDistinct` remains the Overview mechanism paragraph.
   */
  why?: string;
  /**
   * Overview immersive portrait. Used when present; otherwise the authored
   * `summaryImmersive` (after generated-tail strip) remains.
   */
  immersive?: string;
  /**
   * Overview feel line — what the place is like on the skin across a year,
   * and why. Used when the place has no hand-written `experience.feel`
   * (hand-written copy always wins); otherwise the derived line remains.
   */
  feel?: string;
  /**
   * Season cards (sensory read + the reason behind it). Each season fills in
   * only where the place has no hand-written `experience.seasons` prose, so
   * curated seasons are never replaced. Temperatures in °C, localized at render.
   */
  seasons?: Partial<Record<SiteSeasonKey, string>>;
  /**
   * Nearby contrast cards for places with no authored `nearbyContrasts` /
   * `localContrast`; replaces the generic relief-context fallback card.
   */
  contrasts?: ReadonlyArray<{ label: string; note: string }>;
  /** Overview “A short history” — 3 paragraphs of settlement, land use, and people. */
  history: readonly string[];
  /** Field-dossier chapter title (keep ≤20 characters for the jump strip). */
  deepTitle: string;
  /**
   * Longer site history for the Field dossier. 3–4 paragraphs that go deeper
   * than Overview history and must not duplicate those paragraphs.
   */
  deep: readonly string[];
}
