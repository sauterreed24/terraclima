export const SITE_METADATA = {
  appName: "Terraclima",
  title: "Terraclima — North American Microclimate Atlas",
  description:
    "Terraclima — a hand-built North American microclimate atlas for serious readers and curious travelers. Rain shadows, sky islands, and thermal belts across the US, Canada, and Mexico — editorial geography, not a brokerage.",
  socialDescription:
    "A hand-built atlas of North American microclimates. Rain shadows, sky islands, marine layers, and thermal belts explained through the mechanisms that make them real.",
  twitterDescription:
    "A hand-built atlas of North American microclimates. Rain shadows, sky islands, marine layers, and thermal belts.",
  manifestDescription:
    "A hand-built atlas of North American microclimates: rain shadows, sky islands, marine layers, thermal belts, and the terrain mechanisms behind lived weather.",
  canonicalUrl: "https://sauterreed24.github.io/terraclima/",
  previewUrl: "https://sauterreed24.github.io/terraclima/",
  repositoryUrl: "https://github.com/sauterreed24/terraclima",
  ogImageUrl: "https://sauterreed24.github.io/terraclima/og-image.png",
  manifestCategories: ["education", "travel", "weather", "reference"],
} as const;

export function placeDocumentTitle(placeName: string | null | undefined): string {
  return placeName ? `${placeName} · ${SITE_METADATA.appName}` : SITE_METADATA.title;
}
