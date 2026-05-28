import { vi } from "vitest";

export interface MotionProfileMock {
  reduced?: boolean;
  richEffects?: boolean;
  saveData?: boolean;
  cores?: number;
  memoryGb?: number;
}

/**
 * Stub matchMedia + navigator hints for device-profile / motionPolicy tests.
 */
export function mockMotionProfile(profile: MotionProfileMock): () => void {
  const reduced = profile.reduced ?? false;
  const cores = profile.cores ?? 8;
  const memoryGb = profile.memoryGb ?? 8;
  const saveData = profile.saveData ?? false;

  const mq = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  const prevMatchMedia = window.matchMedia;
  window.matchMedia = mq as unknown as typeof window.matchMedia;

  const prevNav = navigator;
  Object.defineProperty(globalThis, "navigator", {
    value: {
      ...navigator,
      hardwareConcurrency: cores,
      deviceMemory: memoryGb,
      connection: { saveData, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    },
    configurable: true,
  });

  return () => {
    window.matchMedia = prevMatchMedia;
    Object.defineProperty(globalThis, "navigator", { value: prevNav, configurable: true });
  };
}
