import type { LivedSignals } from "../types";
import { safeExternalHref } from "./safe-url";

type RuntimeLivedSource = Partial<NonNullable<LivedSignals["sources"]>[number]>;

export interface FormattedLivedSource {
  key: string;
  label: string;
  href?: string;
}

export function formatLivedSources(sources: readonly RuntimeLivedSource[] | null | undefined): FormattedLivedSource[] {
  return sources?.flatMap((source, index) => {
    const href = safeExternalHref(source.url) ?? undefined;
    const label = source.label?.trim() || labelFromHref(href);
    if (!label) return [];
    return [{
      key: `${label}-${href ?? "label-only"}-${index}`,
      label,
      href,
    }];
  }) ?? [];
}

export function countLivedSourceEvidence(sources: readonly RuntimeLivedSource[] | null | undefined): number {
  return formatLivedSources(sources).length;
}

function labelFromHref(href: string | undefined): string {
  if (!href) return "";
  try {
    const hostname = new URL(href).hostname.replace(/^www\./, "");
    return hostname || href;
  } catch {
    return href;
  }
}
