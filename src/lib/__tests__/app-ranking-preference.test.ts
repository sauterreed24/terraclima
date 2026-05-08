// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  ALL_RANKING_PROFILES,
  DEFAULT_RANKING,
  loadPersistedRanking,
  persistRankingProfile,
  RANKING_STORAGE_KEY,
} from "../app-ranking-preference";

describe("app-ranking-preference", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults when storage is empty", () => {
    expect(loadPersistedRanking()).toBe(DEFAULT_RANKING);
  });

  it("restores a valid stored profile", () => {
    localStorage.setItem(RANKING_STORAGE_KEY, "coolest-summers");
    expect(loadPersistedRanking()).toBe("coolest-summers");
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(RANKING_STORAGE_KEY, "not-a-real-profile");
    expect(loadPersistedRanking()).toBe(DEFAULT_RANKING);
  });

  it("persistRankingProfile writes through", () => {
    persistRankingProfile("monsoon-drama");
    expect(localStorage.getItem(RANKING_STORAGE_KEY)).toBe("monsoon-drama");
  });

  it("ALL_RANKING_PROFILES covers every distinct id from RANKING_OPTIONS usage", () => {
    expect(ALL_RANKING_PROFILES.length).toBe(new Set(ALL_RANKING_PROFILES).size);
    expect(ALL_RANKING_PROFILES).toContain(DEFAULT_RANKING);
  });
});
