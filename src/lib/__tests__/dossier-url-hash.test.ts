// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDossierHash, replaceDossierHash, replaceUrlPreservingQuery } from "../dossier-url-hash";

describe("dossier url hash helpers", () => {
  beforeEach(() => {
    window.history.replaceState({ tcPlace: "creel-mx" }, "", "/?p=creel-mx");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("sets #deep-{id} while preserving the query string", () => {
    replaceDossierHash("intro");
    expect(window.location.hash).toBe("#deep-intro");
    expect(window.location.search).toBe("?p=creel-mx");
  });

  it("preserves history.state when syncing the dossier hash", () => {
    replaceDossierHash("risks");
    expect(window.history.state).toEqual({ tcPlace: "creel-mx" });
  });

  it("does not touch history when the dossier hash is already current", () => {
    replaceDossierHash("intro");
    const spy = vi.spyOn(window.history, "replaceState");
    replaceDossierHash("intro");
    expect(spy).not.toHaveBeenCalled();
  });

  it("clears only a #deep- hash while keeping pathname and query", () => {
    replaceDossierHash("intro");
    clearDossierHash();
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?p=creel-mx");
  });

  it("leaves a non-dossier hash untouched", () => {
    window.history.replaceState(null, "", "/?p=creel-mx#gallery");
    const spy = vi.spyOn(window.history, "replaceState");
    clearDossierHash();
    expect(spy).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#gallery");
  });

  it("replaceUrlPreservingQuery keeps the existing history.state", () => {
    window.history.replaceState({ keep: 1 }, "", "/?p=x");
    replaceUrlPreservingQuery("/?p=x#deep-soils");
    expect(window.history.state).toEqual({ keep: 1 });
    expect(window.location.hash).toBe("#deep-soils");
  });
});
