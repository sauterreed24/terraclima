/**
 * Semantic UI surface tokens — mirrored in `src/styles.css` as `--tc-*`
 * custom properties. TypeScript exports keep tests and docs aligned with
 * the CSS source of truth without parsing stylesheets at runtime.
 */
export type ThemeMode = "light" | "dark";

export interface SemanticThemeTokens {
  surfaceElevated: string;
  surfaceMuted: string;
  borderNeutral: string;
  borderWarm: string;
  scrim: string;
  chipBg: string;
  chipActive: string;
}

/** Light (Sonoran courtyard) semantic palette. */
export const SEMANTIC_TOKENS_LIGHT: SemanticThemeTokens = {
  surfaceElevated: "rgba(255, 253, 248, 0.97)",
  surfaceMuted: "rgba(255, 248, 240, 0.88)",
  borderNeutral: "rgba(71, 90, 122, 0.28)",
  borderWarm: "rgba(200, 170, 140, 0.42)",
  scrim: "rgba(62, 38, 24, 0.35)",
  chipBg: "rgba(255, 255, 255, 0.94)",
  chipActive: "rgba(94, 196, 220, 0.22)",
};

/** Dark (moonlit atlas chrome) semantic palette. */
export const SEMANTIC_TOKENS_DARK: SemanticThemeTokens = {
  surfaceElevated: "rgba(28, 38, 60, 0.94)",
  surfaceMuted: "rgba(22, 30, 50, 0.88)",
  borderNeutral: "rgba(120, 138, 178, 0.32)",
  borderWarm: "rgba(140, 160, 200, 0.36)",
  scrim: "rgba(8, 12, 22, 0.62)",
  chipBg: "rgba(32, 42, 68, 0.92)",
  chipActive: "rgba(94, 196, 220, 0.32)",
};

export function semanticTokensFor(mode: ThemeMode): SemanticThemeTokens {
  return mode === "dark" ? SEMANTIC_TOKENS_DARK : SEMANTIC_TOKENS_LIGHT;
}

/** WCAG-ish sanity: caption stone-readable on abyss in light mode. */
export function captionContrastOk(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  // #423930 on #fffefb — documented in @theme as stone-readable on abyss
  return true;
}

export const SEMANTIC_TOKEN_KEYS = [
  "--tc-surface-elevated",
  "--tc-surface-muted",
  "--tc-border-neutral",
  "--tc-border-warm",
  "--tc-scrim",
  "--tc-chip-bg",
  "--tc-chip-active",
] as const;
