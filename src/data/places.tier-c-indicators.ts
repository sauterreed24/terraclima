// ============================================================
// Terraclima — Tier C Housing/Access Indicators & Citations
// ============================================================
// Structured, non-narrative overlay that replaces the retired
// TIER_C_POLISH_GENERATED file for the subset of its data worth keeping:
// legacy housing/access indicators (costPressure, accessFriction — see
// LivedSignals in ../types) and additional HTTPS citations.
//
// TIER_C_POLISH_GENERATED also shipped two auto-templated deepSections
// per place ("…terrain-and-climate-mechanism" / "…lived-climate-read")
// and a templated liveSignals.note. Both were mail-merged prose that
// restated fields already authored elsewhere on the place record
// (reliefContext, elevationM, drivers, koppen, scores, risks) — generic
// narrative fallback, not unique research, and in the note's case some
// entries still referenced the retired social-fabric axis. That prose is
// intentionally NOT migrated: the deterministic derivation in
// place-appendix-sections.ts already covers the same ground from the
// same structured fields, transparently, without pretending to be
// hand-authored copy.
//
// Every place here already ships authored experience copy (see
// places.experience-authored.ts); this file only keeps the numeric
// indicators and citation links a place would otherwise lose entirely,
// since a place with no liveSignals object skips the runtime housing/
// access-index overlay in places.ts (applyLivedIndicators) altogether.
//
// Applied at load time in places.ts via the same merge pass as
// TIER_C_POLISH: authored fields on the base place always win, this only
// fills gaps.
// ============================================================

import type { Citation, LivedSignals } from "../types";

export interface TierCIndicatorsEntry {
  liveSignals?: LivedSignals;
  additionalCitations?: Citation[];
}

export const TIER_C_INDICATORS: Record<string, TierCIndicatorsEntry> = {
  // ===== USA =====
  "brookings-or": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "buffalo-ny": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Buffalo",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "cannon-beach-or": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "cape-may-nj": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "charleston-sc": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Charleston",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "chattanooga-tn": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Chattanooga",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "clayton-ga": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Clayton",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "cloudcroft-nm": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "cody-wy": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Cody",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "columbia-sc": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Columbia",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "corpus-christi-tx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Corpus Christi",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "crested-butte-co": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "des-moines-ia": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Des Moines",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "duluth-mn": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Duluth",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "durango-co": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "ellensburg-wa": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "ely-mn": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Ely",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "eminence-mo": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Eminence",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "erie-pa": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Erie",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "forks-wa": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "friday-harbor-wa": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "galena-il": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Galena",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "gatlinburg-tn": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Gatlinburg",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "geneva-on-the-lake-oh": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Geneva-on-the-Lake",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "grand-marais-mi": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "honolulu-hi": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Honolulu",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "houghton-mi": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "international-falls-mn": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for International Falls",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "jackson-wy": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Jackson",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "joseph-or": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "leadville-co": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "leavenworth-wa": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Leavenworth",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "lewes-de": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Lewes",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "lone-pine-ca": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Lone Pine",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "lubbock-tx": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Lubbock",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "mammoth-lakes-ca": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "marquette-mi": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Marquette",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "medford-or": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Medford",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "mentone-al": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Mentone",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "missoula-mt": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "moab-ut": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Moab",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "mobile-al": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Mobile",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "morgantown-wv": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Morgantown",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "mount-washington-nh": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Mt. Washington Summit",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "mystic-ct": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "nags-head-nc": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Nags Head",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "napa-ca": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Napa",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "naples-fl": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Naples",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "new-orleans-la": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for New Orleans",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "nome-ak": {
    liveSignals: {
      costPressure: 50,
      accessFriction: 78,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Nome",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "norfolk-ct": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Norfolk",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "oakland-md": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Oakland",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "ocean-springs-ms": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Ocean Springs",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "ojai-ca": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Ojai",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "paducah-ky": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Paducah",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "page-az": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Page",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "palm-springs-ca": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Palm Springs",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "pittsfield-ma": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Pittsfield",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "point-reyes-ca": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "port-townsend-wa": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "prescott-az": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "rapid-city-sd": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Rapid City",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "roswell-nm": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Roswell",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "savannah-ga": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Savannah",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "scottsbluff-ne": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Scottsbluff",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "sitka-ak": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "south-padre-tx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for South Padre Island",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },
  "spokane-wa": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Spokane",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "stanley-id": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Stanley",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "state-college-pa": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for State College",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "syracuse-ny": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Syracuse",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "truckee-ca": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "tucson-az": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Tucson",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "washington-dc": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Washington",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "wilmington-de": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Wilmington",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "winthrop-wa": {
    additionalCitations: [
      {
        label: "PRISM Climate Group — gridded 1991–2020 normals",
        kind: "prism",
        url: "https://prism.oregonstate.edu/",
      },
    ],
  },
  "yuma-az": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "U.S. Census Bureau — QuickFacts search for Yuma",
          url: "https://www.census.gov/quickfacts/",
        },
        {
          label: "NOAA — U.S. Climate Normals 1991–2020",
          url: "https://www.ncei.noaa.gov/access/us-climate-normals/",
        },
      ],
    },
  },

  // ===== Canada =====
  "banff-ab": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "Statistics Canada — census profile search for Banff",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "churchill-mb": {
    liveSignals: {
      costPressure: 58,
      accessFriction: 56,
      sources: [
        {
          label: "Statistics Canada — census profile search for Churchill",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "creston-bc": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Creston",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "cypress-hills-sk": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "Statistics Canada — census profile search for Maple Creek / Cypress Hills",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "dawson-city-yt": {
    liveSignals: {
      costPressure: 50,
      accessFriction: 78,
      sources: [
        {
          label: "Statistics Canada — census profile search for Dawson City",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
  },
  "gaspe-qc": {
    liveSignals: {
      costPressure: 58,
      accessFriction: 56,
      sources: [
        {
          label: "Statistics Canada — census profile search for Gaspé",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "grand-manan-nb": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "haida-gwaii-bc": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "halifax-ns": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "inuvik-nt": {
    liveSignals: {
      costPressure: 50,
      accessFriction: 78,
      sources: [
        {
          label: "Statistics Canada — census profile search for Inuvik",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "iqaluit-nu": {
    liveSignals: {
      costPressure: 50,
      accessFriction: 78,
      sources: [
        {
          label: "Statistics Canada — census profile search for Iqaluit",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
  },
  "kamloops-bc": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "Statistics Canada — census profile search for Kamloops",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "kelowna-bc": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "Statistics Canada — census profile search for Kelowna",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "leamington-on": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Leamington",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "medicine-hat-ab": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Medicine Hat",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
  },
  "morden-mb": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Morden",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
  },
  "penticton-bc": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 58,
      sources: [
        {
          label: "Statistics Canada — census profile search for Penticton",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "pincher-creek-ab": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Pincher Creek",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "prince-edward-co-on": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Prince Edward County",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "prince-rupert-bc": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "qualicum-bc": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "revelstoke-bc": {
    liveSignals: {
      costPressure: 58,
      accessFriction: 56,
      sources: [
        {
          label: "Statistics Canada — census profile search for Revelstoke",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "salt-spring-bc": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "squamish-bc": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Squamish",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "st-johns-nl": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "summerland-bc": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 42,
      sources: [
        {
          label: "Statistics Canada — census profile search for Summerland",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "sunshine-coast-bc": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "sutton-qc": {
    liveSignals: {
      costPressure: 36,
      accessFriction: 56,
      sources: [
        {
          label: "Statistics Canada — census profile search for Sutton",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
  },
  "thunder-bay-on": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 18,
      sources: [
        {
          label: "Statistics Canada — census profile search for Thunder Bay",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "tofino-ucluelet-corridor": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "twillingate-nl": {
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },
  "yellowknife-nt": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 78,
      sources: [
        {
          label: "Statistics Canada — census profile search for Yellowknife",
          url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search-results.cfm?Lang=E",
        },
        {
          label: "ECCC — Canadian Climate Normals",
          url: "https://climate.weather.gc.ca/climate_normals/index_e.html",
        },
      ],
    },
    additionalCitations: [
      {
        label: "Climate Atlas of Canada — gridded projections and normals",
        kind: "climate-atlas-canada",
        url: "https://climateatlas.ca/",
      },
    ],
  },

  // ===== Mexico =====
  "bacalar-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Bacalar municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "campeche-mx": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — San Francisco de Campeche municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "coatepec-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "cuatrocienegas-mx": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Cuatro Ciénegas municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
  },
  "durango-mx": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Victoria de Durango municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
  },
  "ensenada-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "guanajuato-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "hermosillo-mx": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Hermosillo municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "la-paz-mx": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — La Paz municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "la-ventosa-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — La Ventosa / Tehuantepec municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "mazatlan-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Mazatlán municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "merida-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Mérida municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "monterrey-mx": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Monterrey municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "morelia-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "palenque-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Palenque municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
  },
  "parras-de-la-fuente-mx": {
    liveSignals: {
      costPressure: 48,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Parras de la Fuente municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
  },
  "puebla-mx": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Puebla municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "puerto-escondido-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Puerto Escondido municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "puerto-vallarta-mx": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Puerto Vallarta municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "real-catorce-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "saltillo-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "taxco-mx": {
    liveSignals: {
      costPressure: 72,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Taxco de Alarcón municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "tequila-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "toluca-mx": {
    liveSignals: {
      costPressure: 76,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Toluca de Lerdo municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "xalapa-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "xilitla-mx": {
    liveSignals: {
      costPressure: 44,
      accessFriction: 62,
      sources: [
        {
          label: "INEGI — Xilitla municipal context",
          url: "https://www.inegi.org.mx/",
        },
        {
          label: "SMN/Conagua — normales climatológicas por estado",
          url: "https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado",
        },
      ],
    },
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
  "zacatecas-mx": {
    additionalCitations: [
      {
        label: "WorldClim — gridded climate normals for Mexico",
        kind: "worldclim",
        url: "https://www.worldclim.org/",
      },
    ],
  },
};
