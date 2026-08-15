import type { SiteHistoryEntry } from "./site-history/types";
import { SITE_HISTORY_USA_1 } from "./site-history/usa-1";
import { SITE_HISTORY_USA_2 } from "./site-history/usa-2";
import { SITE_HISTORY_USA_3 } from "./site-history/usa-3";
import { SITE_HISTORY_USA_4 } from "./site-history/usa-4";
import { SITE_HISTORY_USA_5 } from "./site-history/usa-5";
import { SITE_HISTORY_USA_6 } from "./site-history/usa-6";
import { SITE_HISTORY_CANADA_1 } from "./site-history/canada-1";
import { SITE_HISTORY_CANADA_2 } from "./site-history/canada-2";
import { SITE_HISTORY_MEXICO_1 } from "./site-history/mexico-1";
import { SITE_HISTORY_MEXICO_2 } from "./site-history/mexico-2";

export type { SiteHistoryEntry } from "./site-history/types";
export { withSiteHistoryDeepSections } from "./site-history/apply";

export const SITE_HISTORY: Record<string, SiteHistoryEntry> = {
  ...SITE_HISTORY_USA_1,
  ...SITE_HISTORY_USA_2,
  ...SITE_HISTORY_USA_3,
  ...SITE_HISTORY_USA_4,
  ...SITE_HISTORY_USA_5,
  ...SITE_HISTORY_USA_6,
  ...SITE_HISTORY_CANADA_1,
  ...SITE_HISTORY_CANADA_2,
  ...SITE_HISTORY_MEXICO_1,
  ...SITE_HISTORY_MEXICO_2,
};
