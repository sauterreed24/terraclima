/**
 * Possessive form of a place name for generated copy. A trailing
 * parenthetical qualifier is dropped first, so "Friday Harbor (San Juan
 * Islands)" reads "Friday Harbor's" rather than "Friday Harbor (San Juan
 * Islands)'s"; names ending in "s" take a bare apostrophe.
 */
export function possessive(name: string): string {
  const base = name.replace(/\s*\([^()]*\)\s*$/, "").trim() || name.trim();
  return /s$/i.test(base) ? `${base}'` : `${base}'s`;
}
