// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClimateChangeDelta } from "../charts/ClimateChangeDelta";
import { ClimateRibbon } from "../charts/ClimateRibbon";
import { ComfortMatrix } from "../charts/ComfortMatrix";
import { ContrastChart } from "../charts/ContrastChart";
import { MicroclimateFingerprint } from "../charts/MicroclimateFingerprint";
import { MiniClimateStrip } from "../charts/MiniClimateStrip";
import { PrecipBars } from "../charts/PrecipBars";
import { RiskProfile } from "../charts/RiskProfile";
import { UnitProvider } from "../../lib/units";
import { makePlace } from "../../lib/__tests__/test-fixtures";
import type { Monthly12 } from "../../types";

afterEach(cleanup);

const HIGHS: Monthly12 = [3, 5, 9, 14, 19, 24, 27, 26, 22, 16, 9, 4];
const LOWS: Monthly12 = [-6, -4, 0, 5, 10, 15, 18, 17, 13, 6, 0, -5];
const PRECIP: Monthly12 = [80, 70, 80, 90, 100, 90, 60, 70, 80, 90, 100, 90];
const SNOW: Monthly12 = [40, 30, 20, 5, 0, 0, 0, 0, 0, 5, 20, 40];

function withUnits(node: React.ReactNode) {
  return <UnitProvider>{node}</UnitProvider>;
}

describe("chart components — smoke", () => {
  it("ClimateRibbon renders an SVG with high + low circles for every month", () => {
    const { container } = render(withUnits(<ClimateRibbon highs={HIGHS} lows={LOWS} />));
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    // 12 high dots + 12 low dots.
    expect(container.querySelectorAll("circle").length).toBe(24);
    // Data-bearing label: identifies the warmest/coldest months (unit-invariant).
    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Monthly high and low temperature/);
    expect(label).toMatch(/Warmest Jul/);
    expect(label).toMatch(/coldest Jan/);
  });

  it("ClimateRibbon SVG structure is stable (golden)", () => {
    const { container } = render(withUnits(<ClimateRibbon highs={HIGHS} lows={LOWS} />));
    const svg = container.querySelector("svg");
    expect(svg?.outerHTML).toMatchSnapshot();
  });

  it("MicroclimateFingerprint SVG structure is stable (golden)", () => {
    const place = makePlace({ id: "golden-fingerprint" });
    const { container } = render(withUnits(<MicroclimateFingerprint place={place} />));
    const svg = container.querySelector("svg");
    expect(svg?.outerHTML).toMatchSnapshot();
  });

  it("PrecipBars renders a bar per month and a Σ total callout", () => {
    const { container } = render(withUnits(<PrecipBars precip={PRECIP} snow={SNOW} />));
    const rects = container.querySelectorAll("rect");
    // 12 precip bars, an outline rect on the wettest month, and 12 snow rects.
    expect(rects.length).toBeGreaterThanOrEqual(12);
    expect(container.textContent).toMatch(/Σ /);
    // Data-bearing label: annual total + wettest/driest months (unit-invariant).
    const label = container.querySelector("svg")?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Annual total/);
    expect(label).toMatch(/wettest May/);
    expect(label).toMatch(/driest Jul/);
  });

  it("ComfortMatrix renders for a place fixture without throwing", () => {
    const place = makePlace({ id: "ribbon-place" });
    const { container } = render(withUnits(<ComfortMatrix place={place} />));
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("ContrastChart renders a panel-thin card per LocalContrast entry", () => {
    const { container } = render(
      withUnits(
        <ContrastChart
          contrasts={[
            { radiusKm: 25, summerHighDeltaC: -3, winterLowDeltaC: -2, note: "valley cools faster" },
            { radiusKm: 80, precipDeltaPct: 35 },
          ]}
        />,
      ),
    );
    expect(container.querySelectorAll(".panel-thin").length).toBe(2);
  });

  it("MiniClimateStrip renders a minimal SVG with month columns", () => {
    const { container } = render(withUnits(<MiniClimateStrip place={makePlace({ id: "strip" })} />));
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("RiskProfile renders a row per risk category", () => {
    const place = makePlace({ id: "risks" });
    const { container } = render(withUnits(<RiskProfile place={place} />));
    const rows = container.querySelectorAll('[role="listitem"]');
    expect(rows.length).toBe(Object.keys(place.risks).length);
  });

  it("ClimateChangeDelta renders for a place with climateChange outlook + shifts", () => {
    const place = makePlace({
      id: "future",
      climateChange: {
        outlook2050: "Warmer summers, drier wet season by mid-century.",
        outlook2100: "Continued warming under most CMIP6 scenarios.",
        keyShifts: [
          { variable: "summer high", direction: "up", note: "+2.5°C" },
          { variable: "winter precip", direction: "down" },
        ],
        resilienceNote: "Cold-air drainage and high elevation buffer some heat signal.",
      },
    });
    const { container } = render(withUnits(<ClimateChangeDelta place={place} />));
    expect(container.textContent).toMatch(/2050|warming|summer/i);
  });
});
