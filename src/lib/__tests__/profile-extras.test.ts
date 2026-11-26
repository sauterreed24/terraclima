import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { PLACES_FULL } from "../../data/places.full";
import { withProfileExtras } from "../../data/profile-extras/registry";
import statsJson from "../../data/profile-extras/stats.json";
import { computeProfileFieldGroups, computeProfileStats } from "../profile-stats-compute";
import { rankPlaces } from "../scoring";
import { ALL_RANKING_PROFILES } from "../ranking-options";
import { assessLiveFit, rankLiveFit } from "../live-fit";
import { scorePlaceFeel } from "../place-feel";
import { scoreLivability } from "../livability-score";
import { getClimateTourismProfile } from "../climate-tourism";
import { exportShortlistAsCSV, exportShortlistAsMarkdown } from "../shortlist-export";
import { searchPlaces } from "../place-search";
import { getPlaceVisualSignature } from "../place-visual-signature";

const NOW = new Date(Date.UTC(2026, 5, 15));
/** Drop embedded place objects so results compare by value, not by which fields the place carried. */
const values = (x: unknown): unknown => JSON.parse(JSON.stringify(x, (k, v) => (k === "place" ? v?.id : v)));

describe("profile-only fields (citations, confidence notes, climate-change outlook, In depth chapters)", () => {
  it("atlas places do not carry them; the full list does", () => {
    for (const p of PLACES) {
      expect(p.citations, p.id).toBeUndefined();
      expect(p.climateChange, p.id).toBeUndefined();
      expect(p.confidenceNotes, p.id).toBeUndefined();
      expect(p.deepSections, p.id).toBeUndefined();
    }
    for (const p of PLACES_FULL) {
      expect(p.citations?.length, p.id).toBeGreaterThan(0);
      expect(p.climateChange?.outlook2050, p.id).toBeTruthy();
    }
  });

  it("the registry puts back exactly what the full list has", () => {
    PLACES.forEach((p, i) => expect(values(withProfileExtras(p)), p.id).toEqual(values(PLACES_FULL[i])));
  });

  it("stats.json and the generated group files are up to date (run npm run corpus:profile-stats)", async () => {
    expect(statsJson).toEqual(computeProfileStats(PLACES_FULL));
    const groups = computeProfileFieldGroups(PLACES_FULL);
    for (const [group, fields] of Object.entries(groups)) {
      const file = (await import(`../../data/profile-extras/generated/${group}.json`)).default;
      expect(file, group).toEqual(JSON.parse(JSON.stringify(fields)));
    }
  });

  it("rankings, fit, feel and livability are the same with or without the fields", () => {
    for (const profile of ALL_RANKING_PROFILES) {
      const a = rankPlaces(profile, [...PLACES], NOW).map(r => [r.place.id, r.score]);
      const b = rankPlaces(profile, [...PLACES_FULL], NOW).map(r => [r.place.id, r.score]);
      expect(a, profile).toEqual(b);
    }
    expect(rankLiveFit([...PLACES]).map(r => [r.place.id, r.score])).toEqual(rankLiveFit([...PLACES_FULL]).map(r => [r.place.id, r.score]));
    PLACES.forEach((p, i) => {
      const f = PLACES_FULL[i]!;
      expect(values(assessLiveFit(p)), p.id).toEqual(values(assessLiveFit(f)));
      expect(values(scorePlaceFeel(p)), p.id).toEqual(values(scorePlaceFeel(f)));
      expect(values(scoreLivability(p)), p.id).toEqual(values(scoreLivability(f)));
      expect(values(getClimateTourismProfile(p)), p.id).toEqual(values(getClimateTourismProfile(f)));
      expect(values(getPlaceVisualSignature(p)), p.id).toEqual(values(getPlaceVisualSignature(f)));
    });
  });

  it("exports are the same with or without the fields", () => {
    const at = { generatedAt: NOW, home: PLACES[3]! };
    expect(exportShortlistAsCSV(PLACES, at).body).toEqual(exportShortlistAsCSV(PLACES_FULL, { ...at, home: PLACES_FULL[3]! }).body);
    expect(exportShortlistAsMarkdown(PLACES.slice(0, 6), at).body).toEqual(exportShortlistAsMarkdown(PLACES_FULL.slice(0, 6), { ...at, home: PLACES_FULL[3]! }).body);
  });

  it("search matches the same places once the chapters are loaded", () => {
    for (const q of ["bandelier", "lavender", "orographic", "cold-air pool", "mennonite", "fog", "santa fe", "hoh rainforest", "terroir", "smoke jumpers"]) {
      const a = [...searchPlaces(PLACES, q).rankByPlace].map(([p, r]) => [p.id, r]);
      const b = [...searchPlaces(PLACES_FULL, q).rankByPlace].map(([p, r]) => [p.id, r]);
      expect(a, q).toEqual(b);
    }
  });
});
