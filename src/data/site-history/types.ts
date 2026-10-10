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
   * and why. This overlay is the newest hand-written layer, so it wins over
   * `experience.feel`; without it the corpus line (if not a generated
   * template) or the derived line remains.
   */
  feel?: string;
  /**
   * Season cards (sensory read + the reason behind it). Each season present
   * here wins over `experience.seasons` for that season; missing seasons fall
   * back to corpus prose or the derived read. Temperatures in °C, localized at render.
   */
  seasons?: Partial<Record<SiteSeasonKey, string>>;
  /** Overview “Why people visit” card. Wins over `experience.travelerFit`. */
  travelerFit?: string;
  /** Overview “Who lives here happily” card. Wins over `experience.residentFit`. */
  residentFit?: string;
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
