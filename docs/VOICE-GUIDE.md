# Terraclima corpus voice guide

Short rules for every published place narrative. Automated audits in
`npm run corpus:voice:check` enforce the hard bans; reviewers enforce the rest.

## Purpose

Inspiration comes from specificity, wonder, and honest tradeoffs — not hype,
generic templates, invented lived experience, or hidden uncertainty.

## Pattern that works

1. Open with a concrete scene or physical sensation.
2. Follow immediately with the geographic or climatic reason.
3. Vary sentence length; prefer natural transitions over section scaffolding.
4. Name local landforms, winds, vegetation, light, seasonality, and daily-life tradeoffs.
5. Keep wonder restrained and specific.
6. Use accurate diacritics, Indigenous names, and cultural context.
7. Separate measured fact, derived inference, and editorial interpretation.

## Required authored blocks (all 226)

| Block | Length / intent |
|-------|-----------------|
| `summaryShort` | 16–30 words; one concrete hook |
| `summaryImmersive` | 80–150 words; portrait, not brochure |
| `whyDistinct` | Mechanism-based; why this place, not a neighbor |
| `experience.feel` | Skin-level headline |
| `experience.seasons.*` | Winter / spring / summer / autumn — sensory + reason |
| `experience.travelerFit` | Verified travel fit language |
| `experience.residentFit` | Verified resident fit language |
| `experience.texture` | Honest tradeoff / texture |
| `whoWouldLove` / `whoMightNot` | Useful distinction without stereotyping |
| ≥2 deep sections | Bespoke, grounded in verified evidence |

## Hard bans

Do not use:

- “the atlas reads as,” “the summary captures,” “the climate signature,”
  “climate romance,” or similar corpus-wide scaffolding
- identical paragraph structures or score narration repeated across places
- unsupported superlatives, “hidden gem” hype, “something for everyone”
- fake first-person observation, claims of having visited, or invented local sentiment
- exoticizing Mexican, Indigenous, rural, or northern communities
- paraphrasing source prose too closely
- repeating a numeric score in several sections
- concealing danger, isolation, affordability, seasonal closure, or uncertainty

## Facts vs voice

- Climate numbers come from Climate Data V2 (Daymet V4 R1; default Now =
  1996–2025; WMO comparison = 1991–2020). Do not invent alternate normals.
- Projections stay unavailable where NASA/NEX-GDDP ingest is absent.
- Narrative claims map to research receipts (`ClaimEvidence.fieldPaths`).
- A fluent paragraph is never enough to mark a place verified.

## Lived reality

- No `socialStress`, resident-review sentiment, or crime-impression proxies.
- Use dated factual indicators: housing-cost burden, home-value-to-income
  (where comparable), hospital/airport route times, service-hub class, and
  material transport constraints.
- Missing data stays missing; never impute for ranking.

## Success test

A reader should understand what makes the place singular and can imagine
experiencing it without being misled.
