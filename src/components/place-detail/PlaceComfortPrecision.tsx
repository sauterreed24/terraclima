/**
 * "Comfort precision" section — turns the deterministic
 * `ComfortPrecisionProfile` into a four-card thermal read (peak day
 * feel, dew point, wet-bulb proxy, night recovery), a month-by-month
 * comfort bar grid, and a method footer.
 *
 * Extracted from PlaceDetail.tsx during the dossier refactor; no
 * behavior change.
 */
import { Thermometer } from "lucide-react";
import type { ComfortPrecisionMonth, ComfortPrecisionProfile } from "../../lib/comfort-precision";
import { apparentComfortIndexFromProfile } from "../../lib/comfort-precision";
import { fmtDelta, fmtTemp, useUnits, type TempUnit } from "../../lib/units";
import { Section } from "./place-detail-ui";
import { PD } from "./place-detail-nav";

function precisionTemp(value: number | null, temp: TempUnit): string {
  return value == null ? "n/a" : fmtTemp(value, temp);
}

function precisionBand(score: number): "high" | "mid" | "low" {
  if (score >= 72) return "high";
  if (score >= 48) return "mid";
  return "low";
}

function monthList(months: ComfortPrecisionMonth[]): string {
  return months.map(month => month.label).join(", ");
}

function humiditySourceLabel(month: ComfortPrecisionMonth): string {
  if (month.humiditySource === "measured") return "monthly humidity estimate";
  if (month.humiditySource === "analog") return "climate-analog humidity";
  if (month.humiditySource === "archetype") return "archetype humidity";
  return "humidity unmodeled";
}

export function PlaceComfortPrecision({ profile }: { profile: ComfortPrecisionProfile }) {
  const { temp } = useUnits();
  const peak = profile.peakMonth;
  const sleep = profile.sleepRecoveryMonth;
  const utci = apparentComfortIndexFromProfile(profile);
  const confidenceTone =
    profile.confidence === "high" ? "sage" : profile.confidence === "medium" ? "ochre" : "ember";
  const cards = [
    {
      label: "Peak day feel",
      value: precisionTemp(peak.apparentHighC, temp),
      note: `${peak.label}: air ${precisionTemp(peak.highC, temp)}; ${humiditySourceLabel(peak)}.`,
      tone: "glacier",
    },
    {
      label: "Dew point",
      value: precisionTemp(peak.dewPointC, temp),
      note: peak.humidityPct == null
        ? "Local humidity check needed."
        : `${peak.label} mean humidity ${Math.round(peak.humidityPct)}%.`,
      tone: "sage",
    },
    {
      label: "Wet-bulb proxy",
      value: precisionTemp(peak.wetBulbC, temp),
      note: "Shade heat guardrail; not a full sun-and-wind WBGT.",
      tone: "ochre",
    },
    {
      label: "Night recovery",
      value: `${Math.round(sleep.sleepRecoveryScore)}/100`,
      note: `${sleep.label}: low ${precisionTemp(sleep.lowC, temp)} with ${fmtDelta(sleep.highC - sleep.lowC, temp, { signed: false })} day-night spread.`,
      tone: "aurora",
    },
    {
      label: "Thermal strain (UTCI*)",
      value: `${utci.score}/100`,
      note: `${utci.bandLabel}; feels-like JJA ${precisionTemp(utci.warmSeasonApparentHighC, temp)}. *approximation — no wind/radiant inputs.`,
      tone: "ochre",
    },
  ] as const;

  return (
    <Section anchorId={PD.comfortPrecision} title="Comfort precision" icon={<Thermometer className="w-4 h-4" style={{ color: "#5ec4dc" }} />}>
      <div className="comfort-precision-panel">
        <div className="comfort-precision-panel__head">
          <div>
            <div className="comfort-precision-panel__eyebrow">Human thermal read</div>
            <p>
              {profile.annualComfortMonths}/12 pleasant months and {profile.annualUsableMonths}/12 broadly usable months.
            </p>
          </div>
          <span className="comfort-precision-panel__confidence" data-tone={confidenceTone}>
            {profile.confidence}
          </span>
        </div>

        <div className="comfort-precision-panel__cards" aria-label="Comfort precision summary">
          {cards.map(card => (
            <div key={card.label} className="comfort-precision-card" data-tone={card.tone}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </div>
          ))}
        </div>

        <div className="comfort-precision-panel__months" aria-label="Month-by-month comfort precision">
          {profile.months.map(month => (
            <div
              key={month.label}
              className="comfort-precision-month"
              data-level={precisionBand(Math.min(month.usabilityScore, month.sleepRecoveryScore, month.heatStressScore))}
              title={`${month.label}: usability ${Math.round(month.usabilityScore)}/100, heat guardrail ${Math.round(month.heatStressScore)}/100, sleep recovery ${Math.round(month.sleepRecoveryScore)}/100`}
            >
              <span>{month.label}</span>
              <i aria-hidden>
                <b style={{ height: `${Math.max(8, Math.min(100, month.usabilityScore))}%` }} />
              </i>
              <strong className="font-mono-num">{Math.round(month.usabilityScore)}</strong>
            </div>
          ))}
        </div>

        <div className="comfort-precision-panel__footer">
          <div>
            <span>Easy field window</span>
            <strong>{monthList(profile.easiestMonths)}</strong>
          </div>
          <div>
            <span>Months to verify</span>
            <strong>{monthList(profile.hardestMonths)}</strong>
          </div>
          <div>
            <span>Moisture basis</span>
            <strong>{profile.humidityBasisNote}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{profile.confidenceNote}</strong>
          </div>
        </div>

        <p className="comfort-precision-panel__method">{profile.methodNote}</p>
        <p className="comfort-precision-panel__method">{utci.methodNote}</p>
      </div>
    </Section>
  );
}
