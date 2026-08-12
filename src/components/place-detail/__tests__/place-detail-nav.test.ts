import { describe, expect, it } from "vitest";
import { PD, chapterForAnchorId } from "../place-detail-nav";

describe("place detail nav anchors", () => {
  it("keeps load-bearing PD ids stable while field dossier lives in Portrait", () => {
    expect(PD.deepDives).toBe("pd-deep-dives");
    expect(PD.fieldStory).toBe("pd-field-story");
    expect(PD.atAGlance).toBe("pd-at-a-glance");
    expect(chapterForAnchorId(PD.deepDives)).toBe("portrait");
    expect(chapterForAnchorId(PD.fieldStory)).toBe("portrait");
    expect(chapterForAnchorId(PD.atAGlance)).toBe("climateLand");
    expect(chapterForAnchorId("deep-sequim-hydrology")).toBe("portrait");
    expect(chapterForAnchorId("appendix-season-pocket")).toBe("portrait");
  });
});
