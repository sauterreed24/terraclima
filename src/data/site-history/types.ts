/** Research-backed site history and Overview portrait overlays. */
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
