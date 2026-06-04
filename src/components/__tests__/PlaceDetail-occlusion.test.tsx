// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UnitProvider } from "../../lib/units";
import { makePlace } from "../../lib/__tests__/test-fixtures";
import { PlaceDetail } from "../PlaceDetail";

afterEach(() => cleanup());

async function flushAnimationFrames(times = 2): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
}

describe("PlaceDetail occlusion", () => {
  it("runs panel focus setup after compare/shortcuts occlusion ends", async () => {
    const place = makePlace({ id: "occlusion-regression" });

    const { rerender } = render(
      <UnitProvider>
        <PlaceDetail place={place} occluded onClose={() => undefined} />
      </UnitProvider>,
    );

    const close = await screen.findByRole("button", { name: "Close profile", hidden: true });
    expect(close).not.toHaveFocus();

    rerender(
      <UnitProvider>
        <PlaceDetail place={place} occluded={false} onClose={() => undefined} />
      </UnitProvider>,
    );

    await flushAnimationFrames();
    await waitFor(() => expect(close).toHaveFocus());
  });
});
