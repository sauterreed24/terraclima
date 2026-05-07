// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  parseAppSearch,
  validatedStateFromSearch,
  formatAppRelativeUrl,
  pushAppUrl,
  replaceAppUrl,
} from "../app-url";

describe("parseAppSearch", () => {
  it("returns an empty object for an empty search", () => {
    expect(parseAppSearch("")).toEqual({});
    expect(parseAppSearch("?")).toEqual({});
  });
  it("rejects unknown view values", () => {
    expect(parseAppSearch("?v=spaceship")).toEqual({});
  });
  it("accepts 'collections' and 'learn' as views", () => {
    expect(parseAppSearch("?v=collections")).toEqual({ view: "collections" });
    expect(parseAppSearch("?v=learn")).toEqual({ view: "learn" });
  });
  it("captures p (place) and col (collection)", () => {
    expect(parseAppSearch("?p=foo&col=bar")).toEqual({ placeId: "foo", collectionId: "bar" });
  });
  it("tolerates a missing leading ?", () => {
    expect(parseAppSearch("p=foo")).toEqual({ placeId: "foo" });
  });
});

describe("validatedStateFromSearch", () => {
  const places = { foo: {}, bar: {} };
  const collections = { trip: {} };

  it("falls back to explorer when view is missing or invalid", () => {
    expect(validatedStateFromSearch("", places, collections).view).toBe("explorer");
    expect(validatedStateFromSearch("?v=garbage", places, collections).view).toBe("explorer");
  });
  it("returns null placeId when the id is unknown", () => {
    expect(validatedStateFromSearch("?p=missing", places, collections).placeId).toBeNull();
    expect(validatedStateFromSearch("?p=foo", places, collections).placeId).toBe("foo");
  });
  it("returns null collectionId when the id is unknown", () => {
    expect(validatedStateFromSearch("?col=nope", places, collections).collectionId).toBeNull();
    expect(validatedStateFromSearch("?col=trip", places, collections).collectionId).toBe("trip");
  });
});

describe("formatAppRelativeUrl", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  const ce = (id: string) => id === "trip";

  it("omits ?v=explorer (default view)", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: null, collectionExists: ce }),
    ).toBe("/");
  });
  it("includes ?v= for non-default views", () => {
    expect(
      formatAppRelativeUrl({ view: "collections", placeId: null, collectionId: null, collectionExists: ce }),
    ).toBe("/?v=collections");
  });
  it("includes ?p= when set", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: "foo", collectionId: null, collectionExists: ce }),
    ).toBe("/?p=foo");
  });
  it("only includes ?col= when collectionExists returns true", () => {
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: "ghost", collectionExists: ce }),
    ).toBe("/");
    expect(
      formatAppRelativeUrl({ view: "explorer", placeId: null, collectionId: "trip", collectionExists: ce }),
    ).toBe("/?col=trip");
  });
  it("preserves order: v then p then col", () => {
    const url = formatAppRelativeUrl({
      view: "collections",
      placeId: "foo",
      collectionId: "trip",
      collectionExists: ce,
    });
    expect(url).toBe("/?v=collections&p=foo&col=trip");
  });
});

describe("history writers", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  const ce = (_id: string) => true;

  it("pushAppUrl adds an entry to history", () => {
    const before = window.history.length;
    pushAppUrl({ tcPlace: true }, { view: "explorer", placeId: "foo", collectionId: null, collectionExists: ce });
    expect(window.location.search).toBe("?p=foo");
    expect(window.history.state).toEqual({ tcPlace: true });
    expect(window.history.length).toBeGreaterThanOrEqual(before);
  });

  it("replaceAppUrl mutates without growing history", () => {
    const before = window.history.length;
    replaceAppUrl(null, { view: "collections", placeId: null, collectionId: null, collectionExists: ce });
    expect(window.location.search).toBe("?v=collections");
    expect(window.history.length).toBe(before);
  });
});
