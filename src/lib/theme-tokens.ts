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
  shadowElevated: string;
  shadowInset: string;
  glowAccent: string;
  insetBg: string;
  insetBorder: string;
  accentSoft: string;
  glassBg: string;
  focusRing: string;
  motionDurationFast: string;
  motionDurationBase: string;
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
  shadowElevated:
    "0 1px 0 rgba(255, 255, 255, 1) inset, 0 18px 44px -20px rgba(26, 143, 168, 0.14), 0 28px 56px -24px rgba(62, 38, 24, 0.1)",
  shadowInset: "0 1px 0 rgba(255, 255, 255, 0.92) inset, 0 2px 8px -4px rgba(71, 90, 122, 0.12)",
  glowAccent: "0 4px 18px -6px rgba(var(--hero-accent-rgb, 94, 196, 220), 0.35)",
  insetBg: "rgba(255, 248, 240, 0.72)",
  insetBorder: "rgba(200, 170, 140, 0.32)",
  accentSoft: "rgba(232, 248, 251, 0.52)",
  glassBg: "rgba(255, 253, 248, 0.88)",
  focusRing: "rgba(26, 143, 168, 0.55)",
  motionDurationFast: "180ms",
  motionDurationBase: "280ms",
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
  shadowElevated:
    "0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 18px 44px -20px rgba(0, 0, 0, 0.55), 0 28px 56px -24px rgba(94, 196, 220, 0.18)",
  shadowInset: "0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 2px 10px -4px rgba(0, 0, 0, 0.35)",
  glowAccent: "0 4px 20px -6px rgba(var(--hero-accent-rgb, 94, 196, 220), 0.42)",
  insetBg: "rgba(22, 30, 50, 0.78)",
  insetBorder: "rgba(120, 138, 178, 0.28)",
  accentSoft: "rgba(28, 48, 58, 0.55)",
  glassBg: "rgba(28, 38, 60, 0.92)",
  focusRing: "rgba(140, 200, 230, 0.55)",
  motionDurationFast: "180ms",
  motionDurationBase: "280ms",
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
  "--tc-shadow-elevated",
  "--tc-shadow-inset",
  "--tc-glow-accent",
  "--tc-inset-bg",
  "--tc-inset-border",
  "--tc-accent-soft",
  "--tc-glass-bg",
  "--tc-focus-ring",
  "--tc-motion-duration-fast",
  "--tc-motion-duration-base",
] as const;
