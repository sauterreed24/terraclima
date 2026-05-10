import { describe, expect, it } from "vitest";
import { safeExternalHref } from "../safe-url";

describe("safeExternalHref", () => {
  it("allows absolute http and https URLs", () => {
    expect(safeExternalHref("https://www.ncei.noaa.gov/access/us-climate-normals/")).toBe(
      "https://www.ncei.noaa.gov/access/us-climate-normals/",
    );
    expect(safeExternalHref(" http://example.com/path ")).toBe("http://example.com/path");
  });

  it("rejects executable, relative, and malformed hrefs", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalHref("//example.com/protocol-relative")).toBeNull();
    expect(safeExternalHref("/relative-path")).toBeNull();
    expect(safeExternalHref("not a url")).toBeNull();
  });
});
