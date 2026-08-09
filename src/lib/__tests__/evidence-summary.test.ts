import { describe, expect, it } from "vitest";
import {
  ALLOWED_CITATION_KINDS,
  ALLOWED_CONFIDENCE,
  EVIDENCE_CLASSES,
  assertEvidenceClassesExhaustive,
  buildPlaceEvidenceSummary,
  classifyCitationKind,
  classifyDossierSection,
  countUsableCitationUrls,
  evidenceClassMeta,
  findDuplicateCitations,
  isEvidenceClass,
  listMissingStructuredFields,
  validatePlaceEvidence,
} from "../evidence-summary";
import { PLACES } from "../../data/places";
import type { Citation, Place } from "../../types";

function samplePlace(): Place {
  const place = PLACES[0];
  if (!place) throw new Error("corpus empty");
  return place;
}

describe("evidence-summary", () => {
  it("keeps evidence classes exhaustive and labeled for readers", () => {
    expect(EVIDENCE_CLASSES.length).toBe(6);
    assertEvidenceClassesExhaustive([...EVIDENCE_CLASSES]);
    for (const cls of EVIDENCE_CLASSES) {
      expect(isEvidenceClass(cls)).toBe(true);
      const meta = evidenceClassMeta(cls);
      expect(meta.shortLabel.length).toBeGreaterThan(2);
      expect(meta.description.length).toBeGreaterThan(20);
    }
    expect(isEvidenceClass("not-a-class")).toBe(false);
  });

  it("classifies dossier sections without calling scores measured", () => {
    expect(classifyDossierSection("climate-normals")).toBe("observed-normal");
    expect(classifyDossierSection("mechanism")).toBe("authored-context");
    expect(classifyDossierSection("bioclim")).toBe("deterministic-derived");
    expect(classifyDossierSection("livability")).toBe("screening-score");
    expect(classifyDossierSection("projection-banner")).toBe("regional-projection");
    expect(classifyDossierSection("outlook")).toBe("regional-projection");
  });

  it("maps citation kinds onto evidence classes", () => {
    expect(classifyCitationKind("noaa")).toBe("observed-normal");
    expect(classifyCitationKind("cmip6")).toBe("regional-projection");
    expect(classifyCitationKind("field-observation")).toBe("field-observation");
    expect(classifyCitationKind("usgs")).toBe("authored-context");
  });

  it("counts usable URLs and detects duplicate citations", () => {
    const citations: Citation[] = [
      { label: "NOAA normals", kind: "noaa", url: "https://www.ncei.noaa.gov/" },
      { label: "NOAA normals", kind: "noaa", url: "https://www.ncei.noaa.gov/" },
      { label: "Bad", kind: "other", url: "javascript:alert(1)" },
      { label: "Note only", kind: "academic" },
    ];
    expect(countUsableCitationUrls(citations)).toBe(2);
    expect(findDuplicateCitations(citations)).toEqual(["NOAA normals"]);
  });

  it("builds a truthful summary for a live corpus place", () => {
    const place = samplePlace();
    const summary = buildPlaceEvidenceSummary(place);
    expect(summary.placeId).toBe(place.id);
    expect(summary.normalsPeriod).toMatch(/1996/);
    expect(ALLOWED_CONFIDENCE).toContain(summary.confidence);
    expect(summary.citationCount).toBe(place.citations.length);
    expect(summary.urlCitationCount).toBe(
      place.citations.filter(c => c.url?.startsWith("http")).length,
    );
    expect(summary.classesPresent).toContain("observed-normal");
    expect(summary.classesPresent).toContain("screening-score");
    expect(summary.howToRead.toLowerCase()).toContain("screening");
    expect(summary.howToRead).not.toMatch(/guarantee|parcel|forecast accuracy/i);
  });

  it("lists missing optional fields without inventing values", () => {
    const place = samplePlace();
    const missing = listMissingStructuredFields(place);
    for (const row of missing) {
      expect(row.label.length).toBeGreaterThan(0);
      expect(row.note.length).toBeGreaterThan(10);
    }
  });

  it("validatePlaceEvidence accepts corpus places and rejects empty labels", () => {
    const place = samplePlace();
    expect(validatePlaceEvidence(place)).toEqual([]);

    const broken: Place = {
      ...place,
      citations: [{ label: "   ", kind: "other", url: "https://example.com" }],
    };
    expect(validatePlaceEvidence(broken).some(e => /empty label/.test(e))).toBe(true);
  });

  it("requires URL-backed support when an authored projection override exists", () => {
    const place = samplePlace();
    const withProjection: Place = {
      ...place,
      projection: {
        ssp245: { deltaJJAHighC: 1.2, deltaJANLowC: 1.5, deltaPrecipPct: -3 },
        ssp585: { deltaJJAHighC: 2.1, deltaJANLowC: 2.4, deltaPrecipPct: -5 },
      },
      citations: place.citations.filter(c => c.kind !== "cmip6" && c.kind !== "nasa-nex" && c.kind !== "academic"),
    };
    // Strip academic/other URL citations that would satisfy the rule.
    withProjection.citations = withProjection.citations.map(c =>
      c.kind === "other" || c.kind === "academic" ? { ...c, url: undefined } : c,
    );
    const errors = validatePlaceEvidence(withProjection);
    expect(errors.some(e => /projection override/.test(e))).toBe(true);

    const supported: Place = {
      ...withProjection,
      citations: [
        ...withProjection.citations,
        { label: "IPCC AR6 Atlas", kind: "cmip6", url: "https://interactive-atlas.ipcc.ch/" },
      ],
    };
    expect(validatePlaceEvidence(supported).some(e => /projection override/.test(e))).toBe(false);
  });

  it("keeps citation-kind and confidence allowlists non-empty", () => {
    expect(ALLOWED_CITATION_KINDS.length).toBeGreaterThan(10);
    expect(ALLOWED_CONFIDENCE).toEqual(["high", "moderate", "low"]);
  });
});
