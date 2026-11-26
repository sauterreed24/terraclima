import type { Citation, ClimateChangeOutlook, PlaceDeepSection } from "../../types";

/** A place's profile-only fields as written in `profile-extras/<country>.ts`. */
export interface AuthoredProfileExtras {
  citations: Citation[];
  confidenceNotes?: string;
  climateChange: ClimateChangeOutlook;
  deepSections?: PlaceDeepSection[];
}

/** Polish layered under the authored fields (Tier C additions). */
export interface PolishProfileFields {
  deepSections?: PlaceDeepSection[];
  additionalCitations?: Citation[];
}
