// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useAtlasMapViewCommit } from "../use-atlas-map-view";
import { ATLAS_SAFE_AREA_DESKTOP } from "../../lib/atlas-map-fit";

describe("useAtlasMapViewCommit", () => {
  it("clamps committed pan against content bounds", () => {
    const { result } = renderHook(() => {
      const [view, setView] = useState({ k: 1, x: 0, y: 0 });
      const helpers = useAtlasMapViewCommit({
        width: 800,
        height: 600,
        safeArea: ATLAS_SAFE_AREA_DESKTOP,
        contentBBox: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        setView,
      });
      return { view, ...helpers };
    });

    act(() => {
      result.current.commitView({ k: 1, x: 5000, y: 0 });
    });

    const left = 0 * result.current.view.k + result.current.view.x;
    expect(left).toBeLessThanOrEqual(800 - 80);
  });
});
