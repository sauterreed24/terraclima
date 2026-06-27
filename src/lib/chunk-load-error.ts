/** Detect dynamic-import / Vite chunk load failures for targeted recovery UI. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch dynamically imported module")
    || normalized.includes("loading chunk")
    || normalized.includes("importing a module script failed")
    || normalized.includes("error loading dynamically imported module")
    || normalized.includes("dynamically imported module")
  );
}
