/**
 * Inline SVG logo for the atlas. Three stylised contour lines + a single
 * warm dot read as terrain + sun. Self-contained; no external assets.
 */
export function LogoMark() {
  return (
    <svg viewBox="0 0 64 64" width="36" height="36">
      <defs>
        <radialGradient id="logoGlow" cx="50%" cy="35%" r="60%">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#f3ebe0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#logoGlow)" stroke="rgba(232,155,32,0.45)" />
      <path d="M6 44 Q16 28 24 32 T40 26 T60 20" fill="none" stroke="#8cc8e0" strokeWidth="2.5" />
      <path d="M6 50 Q16 36 24 40 T40 34 T60 28" fill="none" stroke="#c6dcbd" strokeWidth="1.8" opacity="0.9" />
      <path d="M6 56 Q16 44 24 48 T40 42 T60 36" fill="none" stroke="#f0d29c" strokeWidth="1.3" opacity="0.85" />
      <circle cx="32" cy="22" r="3.2" fill="#f0d29c" />
    </svg>
  );
}
