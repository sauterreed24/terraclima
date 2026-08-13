import { useEffect, useId, useState } from "react";
import { BookOpen, ChevronDown, Download, ShieldCheck } from "lucide-react";
import type { Place } from "../../types";
import type { PlaceResearchReceipt } from "../../lib/research/contracts";
import {
  buildPlaceEvidenceSummary,
  evidenceClassMeta,
  type EvidenceClass,
} from "../../lib/evidence-summary";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../data/generated/climate-v2";
import { loadResearchReceipts } from "../../data/generated/research";
import { groupClaimsByScope, sourcesForClaim } from "../../lib/research/claim-scope";
import { safeExternalHref } from "../../lib/safe-url";
import { downloadBlobFile } from "../../lib/download-blob";
import { useProse } from "../../lib/units";

/**
 * Compact “How to read this profile” disclosure for the dossier.
 * Answers what is measured, derived, editorial, projected, or screening-grade
 * without becoming another dashboard.
 */
export function PlaceEvidenceSummary({
  place,
  anchorId,
}: {
  place: Place;
  anchorId?: string;
}) {
  const summary = buildPlaceEvidenceSummary(place);
  const [receipt, setReceipt] = useState<PlaceResearchReceipt | null>(null);
  const claimGroups = receipt ? groupClaimsByScope(receipt) : [];
  const prose = useProse();
  const panelId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadResearchReceipts().then(byId => {
      if (!cancelled) setReceipt(byId[place.id] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id]);

  const exportDossierData = () => {
    downloadBlobFile(
      JSON.stringify({ place, researchReceipt: receipt ?? null }, null, 2),
      `${place.id}-dossier.json`,
      "application/json",
    );
  };

  return (
    <section
      id={anchorId}
      className="tc-evidence-summary anim-fade-in"
      aria-label="Evidence and how to read this profile"
    >
      <button
        type="button"
        className="tc-evidence-summary__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
      >
        <span className="tc-evidence-summary__toggle-lead">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span>
            <span className="tc-evidence-summary__eyebrow">Evidence</span>
            <span className="tc-evidence-summary__title">How to read this profile</span>
          </span>
        </span>
        <span className="tc-evidence-summary__toggle-meta">
          <span className="tc-evidence-summary__pill" data-tone="ice">
            {summary.confidence} confidence
          </span>
          <span className="tc-evidence-summary__pill" data-tone="sage">
            {summary.completenessLabel} coverage
          </span>
          {receipt ? (
            <span className="tc-evidence-summary__pill" data-tone="ice" title={`Research receipt last reviewed ${receipt.reviewedOn}`}>
              Reviewed {receipt.reviewedOn}
            </span>
          ) : null}
          <ChevronDown
            className="w-4 h-4 tc-evidence-summary__chevron"
            data-open={open}
            aria-hidden
          />
        </span>
      </button>

      <p className="tc-evidence-summary__lede">{summary.howToRead}</p>

      {open ? (
        <div id={panelId} className="tc-evidence-summary__panel">
          <div className="tc-evidence-summary__grid">
            <div>
              <div className="tc-evidence-summary__label">Confidence vs completeness</div>
              <p className="tc-evidence-summary__body">
                Editorial confidence ({place.editorialConfidence ?? summary.confidence}) judges narrative
                source strength
                {summary.confidenceNotes ? `: ${prose(summary.confidenceNotes)}` : "."}
                {" "}
                Climate-data confidence ({place.climateDataConfidence ?? "pending"}) reflects grid
                validation status — grid-only places cannot inherit high climate confidence from citation count.
                Completeness ({summary.completenessLabel}) only describes optional field coverage
                — {summary.completenessNote}
              </p>
            </div>
            <div>
              <div className="tc-evidence-summary__label">Normals period</div>
              <p className="tc-evidence-summary__body">
                Charts use Recent · {summary.normalsPeriod} rolling climatology (not a WMO standard normal).
                Official {`1991–2020`} WMO normals remain the comparison/reference from the same Daymet source.
              </p>
              {(() => {
                const shift = CLIMATE_V2_OVERLAY_BY_ID[place.id]?.recentShift;
                if (!shift) return null;
                const fmt = (n: number, unit: string) =>
                  `${n > 0 ? "+" : ""}${n.toFixed(1)}${unit}`;
                return (
                  <p className="tc-evidence-summary__body mt-2">
                    vs 1991–2020: summer high {fmt(shift.jjaHighDeltaC, "°C")}, January low{" "}
                    {fmt(shift.janLowDeltaC, "°C")}, annual precip {fmt(shift.annualPrecipDeltaPct, "%")}.
                  </p>
                );
              })()}
            </div>
          </div>

          <div className="tc-evidence-summary__classes" role="list" aria-label="Evidence classes in this profile">
            {summary.classesPresent.map(cls => (
              <EvidenceClassRow key={cls} cls={cls} note={summary.classNotes[cls]} />
            ))}
          </div>

          {summary.missingFields.length > 0 ? (
            <div className="tc-evidence-summary__missing">
              <div className="tc-evidence-summary__label">Absent optional fields</div>
              <ul>
                {summary.missingFields.map(field => (
                  <li key={field.id}>
                    <strong>{field.label}.</strong> {field.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="tc-evidence-summary__sources">
            <div className="tc-evidence-summary__label flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" aria-hidden />
              Sources by type ({summary.urlCitationCount} with URLs · {summary.citationCount} total)
            </div>
            <ul className="tc-evidence-summary__source-groups">
              {summary.sourceGroups.map(group => (
                <li key={group.kind}>
                  <div className="tc-evidence-summary__source-kind">
                    <span className="chip" data-tone="ice" style={{ fontSize: "10px" }}>
                      {group.kind.toUpperCase()}
                    </span>
                    <span>
                      {group.citations.length} · {group.urlCount} URL
                      {group.urlCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="tc-evidence-summary__source-list">
                    {group.citations.map((c, i) => {
                      const href = safeExternalHref(c.url);
                      return (
                        <li key={`${group.kind}-${i}`}>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="tc-detail-source-link underline decoration-[rgba(140,200,224,0.55)] decoration-dotted hover:text-ice"
                            >
                              {c.label}
                            </a>
                          ) : (
                            c.label
                          )}
                          {c.note ? <span className="text-stone italic"> ({prose(c.note)})</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {receipt ? (
            <div className="tc-evidence-summary__sources">
              <div className="tc-evidence-summary__label flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" aria-hidden />
                Claim-mapped sources by scope · reviewed {receipt.reviewedOn}
              </div>
              <ul className="tc-evidence-summary__source-groups">
                {claimGroups.map(group => (
                  <li key={group.scope}>
                    <div className="tc-evidence-summary__source-kind">
                      <span className="chip" data-tone="glacier" style={{ fontSize: "10px" }}>
                        {group.scope}
                      </span>
                      <span>{group.claims.length} claim{group.claims.length === 1 ? "" : "s"}</span>
                    </div>
                    <ul className="tc-evidence-summary__source-list">
                      {group.claims.map(claim => {
                        const claimSources = sourcesForClaim(receipt, claim);
                        return (
                          <li key={claim.id}>
                            {prose(claim.note ?? claim.calculationOrReasoning ?? "Structured field claim, checked against cited sources.")}
                            {claimSources.length > 0 ? (
                              <span className="text-stone">
                                {" — "}
                                {claimSources.map((source, i) => {
                                  const href = safeExternalHref(source.url);
                                  return (
                                    <span key={source.id}>
                                      {i > 0 ? " · " : ""}
                                      {href ? (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="tc-detail-source-link underline decoration-dotted hover:text-frost"
                                        >
                                          {source.publisher}
                                        </a>
                                      ) : (
                                        source.publisher
                                      )}
                                    </span>
                                  );
                                })}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              {receipt.unresolved.length > 0 ? (
                <p className="tc-evidence-summary__footnote mt-2">
                  {receipt.unresolved.length} field{receipt.unresolved.length === 1 ? "" : "s"} flagged for
                  follow-up research ({receipt.unresolved.map(u => u.issue).join("; ")}); treat those claims as
                  provisional.
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="tc-evidence-summary__footnote">
            Rankings and fit scores are decision aids for comparison, not objective rankings of
            places as lived experience. Section-level citations support the profile; they do not
            claim every sentence is station-sourced.
          </p>

          <div>
            <button type="button" className="btn-ghost !text-xs" onClick={exportDossierData}>
              <Download className="w-3 h-3" aria-hidden />
              Export raw dossier data (JSON)
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EvidenceClassRow({ cls, note }: { cls: EvidenceClass; note?: string }) {
  const meta = evidenceClassMeta(cls);
  return (
    <div className="tc-evidence-summary__class" role="listitem" data-evidence-class={cls}>
      <span className="tc-evidence-chip" data-evidence-class={cls}>
        {meta.shortLabel}
      </span>
      <span className="tc-evidence-summary__class-copy">
        <span className="tc-evidence-summary__class-title">{meta.plainLabel}</span>
        <span className="tc-evidence-summary__class-desc">{note ?? meta.description}</span>
      </span>
    </div>
  );
}

/** Small reusable label for score / projection / derived sections. */
export function EvidenceClassLabel({
  cls,
  className = "",
}: {
  cls: EvidenceClass;
  className?: string;
}) {
  const meta = evidenceClassMeta(cls);
  return (
    <span
      className={`tc-evidence-chip ${className}`.trim()}
      data-evidence-class={cls}
      title={meta.description}
    >
      {meta.shortLabel}
    </span>
  );
}
