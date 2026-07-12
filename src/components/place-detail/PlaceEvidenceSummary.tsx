import { useId, useState } from "react";
import { BookOpen, ChevronDown, ShieldCheck } from "lucide-react";
import type { Place } from "../../types";
import {
  buildPlaceEvidenceSummary,
  evidenceClassMeta,
  type EvidenceClass,
} from "../../lib/evidence-summary";
import { safeExternalHref } from "../../lib/safe-url";
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
  const prose = useProse();
  const panelId = useId();
  const [open, setOpen] = useState(false);

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
                Confidence ({summary.confidence}) is the editorial judgment of source strength
                {summary.confidenceNotes ? `: ${prose(summary.confidenceNotes)}` : "."}
                {" "}
                Completeness ({summary.completenessLabel}) only describes optional field coverage
                — {summary.completenessNote}
              </p>
            </div>
            <div>
              <div className="tc-evidence-summary__label">Normals period</div>
              <p className="tc-evidence-summary__body">
                Authored climate charts use {summary.normalsPeriod} normals when the citation
                window supports that period. Mixed or reanalysis sources are called out in citation notes.
              </p>
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

          <p className="tc-evidence-summary__footnote">
            Rankings and fit scores are decision aids for comparison, not objective rankings of
            places as lived experience. Section-level citations support the profile; they do not
            claim every sentence is station-sourced.
          </p>
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
