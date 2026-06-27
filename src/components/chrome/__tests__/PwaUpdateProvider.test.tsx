// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PwaUpdateProvider } from "../PwaUpdateProvider";
import * as pwa from "../../../lib/pwa";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PwaUpdateProvider", () => {
  it("shows the update banner and activates on refresh", async () => {
    const activateUpdate = vi.fn();
    let onUpdateAvailable: ((registration: ServiceWorkerRegistration) => void) | undefined;
    vi.spyOn(pwa, "registerServiceWorker").mockImplementation((options = {}) => {
      onUpdateAvailable = options.onUpdateAvailable;
      return { activateUpdate, unregister: vi.fn() };
    });

    render(
      <PwaUpdateProvider>
        <p>Atlas shell</p>
      </PwaUpdateProvider>,
    );

    await waitFor(() => expect(onUpdateAvailable).toBeDefined());

    const registration = { waiting: {} } as ServiceWorkerRegistration;
    onUpdateAvailable?.(registration);

    expect(await screen.findByRole("region", { name: "Atlas update" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(activateUpdate).toHaveBeenCalledWith(registration);
  });
});
